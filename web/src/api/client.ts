import { useAuthStore } from '../stores/auth';

/**
 * Typed fetch wrapper for the Nest API.
 * - Prefixes /api/v1
 * - Injects Authorization: Bearer <accessToken>
 * - On 401, tries a single refresh via /auth/refresh, then replays.
 *   If refresh also fails, the auth store is cleared and the router
 *   sends us back to /splash.
 * - Throws `ApiError` with the { code, message, field? } envelope so
 *   callers can match on `err.code`.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public field?: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const BASE = '/api/v1';

async function raw<T>(method: string, path: string, body?: unknown, tokenOverride?: string | null): Promise<T> {
  const token = tokenOverride !== undefined ? tokenOverride : useAuthStore.getState().accessToken;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 no content
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const envelope = json?.error ?? { code: 'UNKNOWN', message: text || 'Request failed' };
    throw new ApiError(res.status, envelope.code, envelope.message, envelope.field, envelope.retryAfterSeconds);
  }

  return json as T;
}

async function withRefresh<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await raw<T>(method, path, body);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    const rt = useAuthStore.getState().refreshToken;
    if (!rt) {
      useAuthStore.getState().clear();
      throw err;
    }

    try {
      const refreshed = await raw<{ accessToken: string; refreshToken: string }>(
        'POST', '/auth/refresh', { refreshToken: rt }, null,
      );
      useAuthStore.getState().setTokens(refreshed.accessToken, refreshed.refreshToken);
      return await raw<T>(method, path, body);
    } catch (e) {
      useAuthStore.getState().clear();
      throw err;
    }
  }
}

export const api = {
  get:    <T>(path: string) => withRefresh<T>('GET', path),
  post:   <T>(path: string, body?: unknown) => withRefresh<T>('POST', path, body),
  put:    <T>(path: string, body?: unknown) => withRefresh<T>('PUT', path, body),
  patch:  <T>(path: string, body?: unknown) => withRefresh<T>('PATCH', path, body),
  delete: <T>(path: string) => withRefresh<T>('DELETE', path),

  /** Escape hatch — for /auth/otp/request etc. where no token exists yet. */
  postPublic: <T>(path: string, body?: unknown) => raw<T>('POST', path, body, null),
};

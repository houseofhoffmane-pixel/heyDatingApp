import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PushPayload, PushProvider, PushTarget } from './push.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * FCM HTTP v1 sender — uses the service-account JSON to mint an OAuth2
 * access token (RS256-signed JWT, cached until 5 min before expiry) and
 * POSTs one message per device token.
 *
 * We deliberately avoid `firebase-admin` to keep the dep tree small; the
 * JWT exchange + send call here is ~50 lines and isolates the only piece
 * that talks to Google. Tokens that come back as `UNREGISTERED` or
 * `INVALID_ARGUMENT` are surfaced to PushService so it can purge them
 * from `device_tokens`.
 */
@Injectable()
export class PushFcmProvider implements PushProvider {
  private readonly logger = new Logger(PushFcmProvider.name);
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  private get creds(): { client_email: string; private_key: string; project_id?: string } {
    const env = loadEnv();
    if (!env.FCM_CREDENTIALS_JSON) {
      throw new Error('FCM_PROVIDER=real requires FCM_CREDENTIALS_JSON');
    }
    return JSON.parse(env.FCM_CREDENTIALS_JSON);
  }

  private get projectId(): string {
    const env = loadEnv();
    return env.FCM_PROJECT_ID || this.creds.project_id || '';
  }

  async send(target: PushTarget, payload: PushPayload) {
    if (target.fcmTokens.length === 0) return { sent: 0, failed: 0 };
    const accessToken = await this.getAccessToken();

    // FCM HTTP v1 is one-message-per-call. Parallel within reason.
    const results = await Promise.all(
      target.fcmTokens.map(async (token) => {
        const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
        const body = {
          message: {
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
            apns: payload.sound ? { payload: { aps: { sound: payload.sound } } } : undefined,
          },
        };
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
          if (res.ok) return { ok: true, token };
          const errBody = await res.json().catch(() => ({}));
          const code = (errBody as any)?.error?.status as string | undefined;
          const purgeable = code === 'NOT_FOUND' || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT';
          return { ok: false, token, purgeable, status: res.status };
        } catch (err) {
          this.logger.warn(`fcm send threw for ${token.slice(0, 6)}…: ${err}`);
          return { ok: false, token, purgeable: false };
        }
      }),
    );

    return {
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      purgeTokens: results.filter((r) => !r.ok && (r as any).purgeable).map((r) => r.token),
    };
  }

  // ── OAuth2 access token ──────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cachedToken && this.cachedToken.expiresAt > now + 300) {
      return this.cachedToken.accessToken;
    }

    const c = this.creds;
    const assertion = jwt.sign(
      {
        iss: c.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      },
      c.private_key,
      { algorithm: 'RS256' },
    );

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`FCM token exchange failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = { accessToken: json.access_token, expiresAt: now + json.expires_in };
    return json.access_token;
  }
}

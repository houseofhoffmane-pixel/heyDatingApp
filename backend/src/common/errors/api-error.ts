import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Spec error envelope: `{ error: { code, message, field? } }`.
 * Use ApiError.<helper>() from controllers/services for any user-facing
 * failure so the wire format stays consistent.
 */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super({ error: { code, message, ...(field ? { field } : {}) } }, status);
  }

  static unauthorized(code: string, message: string) {
    return new ApiError(HttpStatus.UNAUTHORIZED, code, message);
  }

  static forbidden(code: string, message: string) {
    return new ApiError(HttpStatus.FORBIDDEN, code, message);
  }

  static notFound(code: string, message: string) {
    return new ApiError(HttpStatus.NOT_FOUND, code, message);
  }

  static badRequest(code: string, message: string, field?: string) {
    return new ApiError(HttpStatus.BAD_REQUEST, code, message, field);
  }

  static unprocessable(code: string, message: string, field?: string) {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, code, message, field);
  }

  static conflict(code: string, message: string) {
    return new ApiError(HttpStatus.CONFLICT, code, message);
  }

  static tooManyRequests(code: string, message: string, retryAfterSeconds?: number) {
    const err = new ApiError(HttpStatus.TOO_MANY_REQUESTS, code, message);
    if (retryAfterSeconds !== undefined) {
      (err.getResponse() as any).error.retryAfterSeconds = retryAfterSeconds;
    }
    return err;
  }

  static internal(code: string, message: string) {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, code, message);
  }
}

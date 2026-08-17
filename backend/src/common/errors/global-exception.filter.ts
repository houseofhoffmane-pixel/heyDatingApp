import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * One place turns every thrown thing into the spec envelope:
 *   { error: { code, message, field?, ...extras } }
 *
 * HttpException (incl. ApiError, ValidationPipe rejections) → passes
 *   its status + body through with light shape normalisation.
 * Anything else                                              → 500 with
 *   a generic message; the stack is logged, never returned.
 *
 * Registered as APP_FILTER in AppModule so it wraps every controller
 * and websocket handler.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = normaliseHttpBody(exception.getResponse(), exception.message);

      // Log 5xxs even if wrapped as HttpException (rare but possible).
      if (status >= 500) {
        this.logger.error({ err: exception, path: req.url }, `${status} ${exception.message}`);
      }
      res.status(status).json(body);
      return;
    }

    // Anything else = programmer error / crash. Log full detail;
    // return a generic message so we don't leak internals to the client.
    this.logger.error(
      { err: exception, path: req.url, method: req.method },
      'Unhandled exception',
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong. Try again.',
      },
    });
  }
}

/**
 * Nest's HttpException body can be a string, an object with { error }
 * (our ApiError shape), or an object with { message, statusCode, ... }
 * (Nest's default / ValidationPipe). Normalise to { error: { code, message } }.
 */
function normaliseHttpBody(raw: unknown, fallbackMessage: string): { error: any } {
  // Our ApiError already produces { error: {...} } — passthrough.
  if (raw && typeof raw === 'object' && 'error' in raw && (raw as any).error) {
    return raw as { error: any };
  }

  // Nest / ValidationPipe: { statusCode, message, error }
  if (raw && typeof raw === 'object') {
    const r = raw as any;
    const msg = Array.isArray(r.message) ? r.message.join('; ') : (r.message ?? fallbackMessage);
    // Guess a code from the framework-provided `error` string ("Bad Request" → "BAD_REQUEST").
    const code = typeof r.error === 'string'
      ? r.error.toUpperCase().replace(/\s+/g, '_')
      : 'ERROR';
    return { error: { code, message: msg } };
  }

  // Plain string body.
  return { error: { code: 'ERROR', message: String(raw ?? fallbackMessage) } };
}

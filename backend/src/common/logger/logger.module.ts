import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { loadEnv } from '../config/env';

/**
 * Structured logging via pino. JSON in production, pretty-printed
 * dev output when NODE_ENV=development.
 *
 * Every log line inside an HTTP request context automatically carries
 * `req.id` — Nest ties it via AsyncLocalStorage so a plain
 * `logger.log('...')` from any service under that request has the
 * correlation id attached.
 *
 * Redactions strip common secret headers/fields before they touch the
 * log stream. `redact.remove: true` deletes the key entirely rather
 * than showing "[Redacted]" so grepping for `authorization` never
 * false-hits.
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: loadEnv().LOG_LEVEL,
        // Accept a client-supplied X-Request-Id (helpful for support
        // tickets: user reports a broken action, we grep for their id).
        // Generate one otherwise.
        genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
        customProps: () => ({}),
        // One line per completed HTTP request. Nest's own controller
        // logs are silenced (we use this instead).
        autoLogging: {
          ignore: (req) => req.url === '/api/v1/health',
        },
        serializers: {
          req(req) {
            return {
              id: req.id,
              method: req.method,
              url: req.url,
              // req.ip is real because main.ts sets trust proxy
              ip: req.ip,
              userAgent: req.headers?.['user-agent'],
            };
          },
          res(res) {
            return { statusCode: res.statusCode };
          },
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.body.password',
            'req.body.refreshToken',
            'req.body.code',
            '*.password',
            '*.refreshToken',
            '*.accessToken',
            '*.tokenHash',
            '*.selfieS3Key',
          ],
          remove: true,
        },
        transport: loadEnv().NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l' } }
          : undefined,
      },
    }),
  ],
})
export class LoggerModule {}

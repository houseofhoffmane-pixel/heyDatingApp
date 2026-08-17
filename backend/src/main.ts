import 'reflect-metadata';
// MUST run before any @prisma/client import — assembles DATABASE_URL
// from DB_USER/DB_PASS/DB_HOST/DB_PORT/DB_NAME if the caller preferred
// splitting the pieces up in the host UI instead of URL-encoding a
// full connection string.
import { resolveDatabaseUrl } from './common/config/db-url';
resolveDatabaseUrl();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { loadEnv } from './common/config/env';

async function bootstrap() {
  // Bootstrap-time logger — pino isn't wired yet, so use Nest's built-in
  // for these earliest lines. Once the app is created we swap in pino
  // and log everything else through it.
  const bootLog = new Logger('Bootstrap');
  bootLog.log(`node=${process.version} platform=${process.platform}-${process.arch}`);
  bootLog.log(`PORT=${process.env.PORT ?? '(unset, will default)'} NODE_ENV=${process.env.NODE_ENV}`);
  bootLog.log(`DATABASE_URL=${process.env.DATABASE_URL ? '(set, ' + process.env.DATABASE_URL.split('@')[1] + ')' : '(MISSING)'}`);

  const env = loadEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Buffer logs until we swap in pino below.
    bufferLogs: true,
  });

  // Swap Nest's default logger for pino. Every log across the app
  // (including framework internals) now goes through it — JSON in
  // prod, pretty in dev, redacted of secrets, correlated with req.id.
  app.useLogger(app.get(PinoLogger));

  // Behind Hostinger's reverse proxy — trust the first hop so req.ip is
  // the real client, not the proxy. Feeds the per-IP rate limiter and
  // the auth-attempts log correctly.
  app.set('trust proxy', 1);

  // Security headers. CSP disabled until we emit per-hash nonces for
  // Vite's assets. Rest of helmet's defaults are safe (HSTS, X-CTO,
  // Referrer-Policy, etc.). CORP relaxed to cross-origin so localhost
  // dev proxy can load photo URLs from the API origin.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // Explicit body-size caps. Photo uploads bypass this (raw bytes
  // through the storage controller).
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Single funnel for every thrown error → { error: { code, message } }.
  // 5xxs log the stack; response body is generic.
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Let OnModuleDestroy run when Hostinger sends SIGTERM. Without this,
  // Prisma stays open until the process is force-killed, orphaning the
  // connection on the DB side.
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  new Logger('Bootstrap').log(`Hey API listening on :${env.PORT}`);
}

bootstrap().catch((err) => {
  // Never let a top-level throw crash without a visible stack — the
  // Hostinger log otherwise just shows "Error: ..." with no context.
  // eslint-disable-next-line no-console
  console.error('[bootstrap] fatal:', err);
  process.exit(1);
});

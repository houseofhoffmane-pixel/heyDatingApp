import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadEnv } from './common/config/env';

async function bootstrap() {
  const log = new Logger('Bootstrap');

  // Log the effective config early so a startup crash includes what we
  // tried to boot with. Never log secrets — just presence flags.
  log.log(`node=${process.version} platform=${process.platform}-${process.arch}`);
  log.log(`PORT=${process.env.PORT ?? '(unset, will default)'} NODE_ENV=${process.env.NODE_ENV}`);
  log.log(`DATABASE_URL=${process.env.DATABASE_URL ? '(set, ' + process.env.DATABASE_URL.split('@')[1] + ')' : '(MISSING)'}`);

  const env = loadEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Behind Hostinger's reverse proxy — trust the first hop so req.ip is
  // the real client, not the proxy. Feeds the per-IP rate limiter and
  // the auth-attempts log correctly.
  app.set('trust proxy', 1);

  // Security headers. contentSecurityPolicy is disabled because the SPA
  // ships assets with hashed filenames from same-origin and adding a
  // full CSP requires per-hash nonces we don't emit yet. Everything
  // else in helmet's defaults is safe (HSTS, X-Content-Type-Options,
  // Referrer-Policy, X-DNS-Prefetch-Control, X-Download-Options,
  // Strict-Transport-Security, etc.).
  //
  // crossOriginResourcePolicy relaxed to `cross-origin` so the SPA
  // dev server (localhost:5173) can load photo URLs from the API
  // origin (localhost:3000) during development.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // Explicit body limits. Default express.json() is 100kb; we set it
  // explicitly for clarity + urlencoded gets the same cap. Photo
  // uploads go through the storage controller (raw bytes, no JSON), so
  // the 100kb cap doesn't affect them.
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Bind on 0.0.0.0 so Passenger/Hostinger's reverse proxy can reach us
  // even if it's using a UNIX socket or a private-net IP.
  await app.listen(env.PORT, '0.0.0.0');
  log.log(`Hey API listening on :${env.PORT}`);
}

bootstrap().catch((err) => {
  // Never let a top-level throw crash without a visible stack — the
  // Hostinger log otherwise just shows "Error: PANIC..." with no context.
  // eslint-disable-next-line no-console
  console.error('[bootstrap] fatal:', err);
  process.exit(1);
});

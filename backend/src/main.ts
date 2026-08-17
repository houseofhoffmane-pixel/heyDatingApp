import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/errors/global-exception.filter';
import { loadEnv } from './common/config/env';

// Every step is wrapped in a labeled try so a runtime crash logs which
// stage broke — not just a bare "PANIC" or "Error" with no context.
async function bootstrap() {
  const log = new Logger('Bootstrap');

  log.log(`node=${process.version} platform=${process.platform}-${process.arch}`);
  log.log(`PORT=${process.env.PORT ?? '(unset)'} NODE_ENV=${process.env.NODE_ENV ?? '(unset)'}`);
  log.log(`DATABASE_URL=${process.env.DATABASE_URL ? '(direct)' : '(not set — will assemble from DB_* if present)'}`);
  log.log(`DB_USER=${process.env.DB_USER ?? '(unset)'} DB_HOST=${process.env.DB_HOST ?? '(unset)'} DB_NAME=${process.env.DB_NAME ?? '(unset)'}`);

  let env;
  try {
    env = loadEnv();
    log.log(`[step 1/5] env loaded — final DATABASE_URL host: ${env.DATABASE_URL.split('@')[1] ?? '?'}`);
  } catch (err) {
    log.error(`[step 1/5] env FAILED: ${(err as Error).message}`);
    throw err;
  }

  let app: NestExpressApplication;
  try {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
    log.log('[step 2/5] Nest app created');
  } catch (err) {
    log.error(`[step 2/5] Nest create FAILED: ${(err as Error).message}`);
    throw err;
  }

  try {
    app.useLogger(app.get(PinoLogger));
    app.set('trust proxy', 1);
    app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }));
    app.use(json({ limit: '100kb' }));
    app.use(urlencoded({ extended: true, limit: '100kb' }));
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.enableShutdownHooks();
    log.log('[step 3/5] middleware + filters wired');
  } catch (err) {
    log.error(`[step 3/5] middleware wire FAILED: ${(err as Error).message}`);
    throw err;
  }

  try {
    await app.listen(env.PORT, '0.0.0.0');
    log.log(`[step 4/5] listening on 0.0.0.0:${env.PORT}`);
  } catch (err) {
    log.error(`[step 4/5] listen FAILED: ${(err as Error).message}`);
    throw err;
  }

  log.log(`[step 5/5] Hey API ready — public base ${env.PUBLIC_BASE_URL ?? '(unset)'}`);
}

bootstrap().catch((err) => {
  // Never let a top-level throw crash without a visible stack — the
  // Hostinger log otherwise just shows "Error: ..." with no context.
  // eslint-disable-next-line no-console
  console.error('[bootstrap] fatal:', err);
  process.exit(1);
});

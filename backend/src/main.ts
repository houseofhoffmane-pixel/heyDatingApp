import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
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
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

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

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadEnv } from './common/config/env';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(env.PORT);
  Logger.log(`Hey API listening on :${env.PORT}`, 'Bootstrap');
}

bootstrap();

import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

/**
 * Boots a complete Nest app on a random port so every spec exercises the
 * real HTTP + WebSocket surface (controllers, guards, gateway, Redis,
 * BullMQ, prisma).
 *
 * Each spec calls `bootTestApp()` in `beforeAll` and `app.close()` in
 * `afterAll`. The Redis + Prisma clients live in the app's DI container;
 * `app.close()` walks `OnModuleDestroy` so connections drain cleanly.
 */
export interface TestApp {
  app: INestApplication;
  port: number;
  baseUrl: string;
  wsUrl: string;
}

export async function bootTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  await app.listen(0);

  const server = app.getHttpServer();
  const port = (server.address() as any).port as number;

  return {
    app,
    port,
    baseUrl: `http://localhost:${port}/api/v1`,
    wsUrl:   `http://localhost:${port}/rt`,
  };
}

export async function closeTestApp(t: TestApp) {
  await t.app.close();
}

import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Liveness/readiness probe. Uptime monitors and Hostinger's own
 * health checks read this.
 *
 * Actually queries the DB (`SELECT 1`) with a 2s timeout. The
 * lazy-connect PrismaService means a healthy `/health` also proves
 * we can reach the DB — bad `DATABASE_URL` shows up here first.
 *
 * Response:
 *   200 { ok: true,  db: true,  version, uptimeSec }   when healthy
 *   503 { ok: false, db: false, version, uptimeSec }   when DB is down
 *
 * Under 2s timeout regardless — never blocks past the timeout so the
 * proxy doesn't queue behind a stuck query.
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health(@Res({ passthrough: true }) res: Response) {
    const dbOk = await withTimeout(
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      2000,
      false,
    );

    const body = {
      ok: dbOk,
      db: dbOk,
      version: '0.1.0',
      uptimeSec: Math.round(process.uptime()),
    };

    if (!dbOk) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(onTimeout), ms)),
  ]);
}

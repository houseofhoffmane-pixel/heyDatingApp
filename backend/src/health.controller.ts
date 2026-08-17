import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Liveness/readiness probe. Returns 200 healthy or 503 with the reason
 * so we can see what's broken without SSH access.
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health(@Res({ passthrough: true }) res: Response) {
    let dbOk = false;
    let dbError: string | null = null;

    try {
      await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        2000,
        () => { throw new Error('DB query timed out after 2s'); },
      );
      dbOk = true;
    } catch (e: any) {
      dbError = String(e?.message ?? e).slice(0, 500);
    }

    const body: Record<string, unknown> = {
      ok: dbOk,
      db: dbOk,
      version: '0.1.0',
      uptimeSec: Math.round(process.uptime()),
    };
    if (!dbOk) {
      body.dbError = dbError;
      // Also surface the DB parts we tried to connect with (no secrets)
      // so a misconfigured DB_HOST / DB_NAME is obvious from /health alone.
      const dbUrl = process.env.DATABASE_URL ?? '';
      const hostPart = dbUrl.split('@')[1] ?? '(no URL)';
      body.dbTarget = hostPart;
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => {
      try { onTimeout(); } catch (e) { reject(e); }
    }, ms)),
  ]);
}

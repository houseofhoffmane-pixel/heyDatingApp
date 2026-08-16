import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Liveness/readiness probe. Returns `ok: true` once the DB responds.
 * (Redis was removed in Sprint 2 — presence and rate limits live
 * in-process now.)
 */
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('health')
  async health() {
    const db = await this.prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);
    return { ok: db, db, version: '0.1.0' };
  }
}

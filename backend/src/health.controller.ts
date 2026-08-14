import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';
import { Public } from './modules/auth/decorators/public.decorator';

/**
 * Liveness/readiness probe. Returns `ok: true` once DB and Redis respond.
 * Useful for docker-compose health checks and uptime monitors.
 */
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  async health() {
    const [db, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
    ]);
    const ok = db.status === 'fulfilled' && redis.status === 'fulfilled';
    return {
      ok,
      db: db.status === 'fulfilled',
      redis: redis.status === 'fulfilled',
      version: '0.1.0',
    };
  }
}

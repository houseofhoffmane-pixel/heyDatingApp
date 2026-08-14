import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { loadEnv } from '../../../common/config/env';

/**
 * Cleans up matches that never produced a message in `UNMATCH_SILENCE_DAYS`
 * (default 14). The frontend explicitly tells users about this:
 *   "unmatch fairy ✨ keeps things tidy after 14 days of silence."
 *
 * We flip the status to `expired` so both sides quietly lose the chat —
 * no notification, no callout. Daily at 04:00.
 */
@Injectable()
export class UnmatchFairyProcessor {
  private readonly logger = new Logger(UnmatchFairyProcessor.name);
  private readonly LOCK = 'cron:unmatch-fairy';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async run() {
    const got = await this.redis.client.set(this.LOCK, '1', 'EX', 60 * 60, 'NX');
    if (got !== 'OK') return;

    try {
      const cutoff = new Date(Date.now() - loadEnv().UNMATCH_SILENCE_DAYS * 24 * 60 * 60 * 1000);
      const result = await this.prisma.match.updateMany({
        where: {
          status: 'active',
          lastMessageAt: null,
          createdAt: { lte: cutoff },
        },
        data: { status: 'expired' },
      });
      if (result.count > 0) {
        this.logger.log(`unmatch-fairy expired ${result.count} silent matches`);
      }
    } finally {
      await this.redis.client.del(this.LOCK);
    }
  }
}

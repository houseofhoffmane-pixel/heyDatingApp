import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';

/**
 * Flips paused/hidden users back to `active` once their `autoResumeAt`
 * passes. Runs every 15 minutes — finer granularity isn't necessary since
 * the user picks the date in the UI, not the minute.
 */
@Injectable()
export class AutoResumeProcessor {
  private readonly logger = new Logger(AutoResumeProcessor.name);
  private readonly LOCK = 'cron:auto-resume';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run() {
    const got = await this.redis.client.set(this.LOCK, '1', 'EX', 1500, 'NX');
    if (got !== 'OK') return;

    try {
      const result = await this.prisma.user.updateMany({
        where: {
          status: { in: ['paused', 'hidden'] },
          autoResumeAt: { lte: new Date() },
        },
        data: { status: 'active', autoResumeAt: null },
      });
      if (result.count > 0) {
        this.logger.log(`auto-resumed ${result.count} accounts`);
      }
    } finally {
      await this.redis.client.del(this.LOCK);
    }
  }
}

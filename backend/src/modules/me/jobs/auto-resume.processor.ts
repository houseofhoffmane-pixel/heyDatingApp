import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Flips paused/hidden users back to `active` once their `autoResumeAt`
 * passes. Runs every 30 minutes — finer granularity isn't necessary since
 * the user picks the date in the UI, not the minute.
 */
@Injectable()
export class AutoResumeProcessor {
  private readonly logger = new Logger(AutoResumeProcessor.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async run() {
    if (this.running) return;
    this.running = true;

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
      this.running = false;
    }
  }
}

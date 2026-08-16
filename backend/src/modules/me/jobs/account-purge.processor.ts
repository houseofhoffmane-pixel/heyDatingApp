import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import { StorageService } from '../../storage/storage.service';
import { loadEnv } from '../../../common/config/env';

/**
 * Hard-deletes accounts that were soft-deleted more than
 * `ACCOUNT_PURGE_DAYS` (default 30) ago. Cascade FKs on the schema do most
 * of the work — profile, photos, matches, messages, blocks, device tokens,
 * refresh tokens, notifications all cascade off the user row. We also
 * remove any remaining photo objects from storage to keep the bucket clean.
 *
 * Daily at 03:00 server time.
 */
@Injectable()
export class AccountPurgeProcessor {
  private readonly logger = new Logger(AccountPurgeProcessor.name);
  private readonly LOCK = 'cron:account-purge';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run() {
    const got = await this.redis.client.set(this.LOCK, '1', 'EX', 60 * 60, 'NX');
    if (got !== 'OK') return;

    try {
      const cutoff = new Date(Date.now() - loadEnv().ACCOUNT_PURGE_DAYS * 24 * 60 * 60 * 1000);
      const due = await this.prisma.user.findMany({
        where: { status: 'deleted', deletedAt: { lte: cutoff } },
        select: { id: true },
      });
      if (due.length === 0) return;

      for (const u of due) {
        // Photos belonging to the profile — collect keys before the cascade
        // tears the rows out.
        const photos = await this.prisma.photo.findMany({
          where: { userId: u.id },
          select: { s3Key: true },
        });

        await this.prisma.user.delete({ where: { id: u.id } });

        await Promise.all(
          photos.map((p) => this.storage.remove(p.s3Key).catch(() => undefined)),
        );
      }
      this.logger.log(`purged ${due.length} accounts`);
    } catch (err: any) {
      this.logger.error(`account-purge failed: ${err?.message}`);
    } finally {
      await this.redis.client.del(this.LOCK);
    }
  }
}

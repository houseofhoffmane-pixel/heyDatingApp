import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CheckinService } from '../checkin.service';
import { RedisService } from '../../../common/redis/redis.service';

/**
 * Runs every minute (per spec §6). Sets `left_at` on every check-in past
 * its `expires_at`, then emits `place:count` + `checkin:expired` so live
 * map viewers see the pin tick down and the leaver's UI updates.
 *
 * Single-leader lock via `SET NX EX` — if you scale this app to multiple
 * instances, only one fires per minute. The TTL exceeds the cron interval
 * so a crashed leader doesn't gridlock the next tick.
 */
@Injectable()
export class CheckinExpiryProcessor {
  private readonly logger = new Logger(CheckinExpiryProcessor.name);
  private readonly LOCK_KEY = 'cron:checkin-expiry';
  private readonly LOCK_TTL_S = 90;

  constructor(
    private readonly checkins: CheckinService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    const got = await this.redis.client.set(this.LOCK_KEY, '1', 'EX', this.LOCK_TTL_S, 'NX');
    if (got !== 'OK') return; // another instance is running it

    try {
      const result = await this.checkins.expireDue();
      if (result.expired > 0) {
        this.logger.log(`expired ${result.expired} check-ins across ${result.placesTouched.length} places`);
      }
    } catch (err: any) {
      this.logger.error(`checkin-expiry failed: ${err?.message}`);
    } finally {
      await this.redis.client.del(this.LOCK_KEY);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Fixed-window rate limiting in Redis. Each key has an INCR + EXPIRE done
 * atomically; if the count exceeds the limit within the window the caller
 * gets back the seconds-remaining so the API can return 429 with the right
 * Retry-After.
 *
 * Limit math is intentionally simple — a sliding-window log is overkill
 * here. Quotas come from env (RL_*).
 */
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Increment a counter and return whether the caller is over quota.
   * `windowSeconds` resets the counter; `max` is the cap inside the window.
   */
  async hit(
    key: string,
    max: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
    const fullKey = `rl:${key}`;
    const pipeline = this.redis.client.multi();
    pipeline.incr(fullKey);
    pipeline.ttl(fullKey);
    const [[, countRaw], [, ttlRaw]] = (await pipeline.exec()) as [
      [Error | null, number],
      [Error | null, number],
    ];
    const count = Number(countRaw);
    let ttl = Number(ttlRaw);

    // ttl=-1 means key exists with no expiry (race on first INCR before EXPIRE).
    // ttl=-2 means key did not exist (treated as fresh window).
    if (ttl < 0) {
      await this.redis.client.expire(fullKey, windowSeconds);
      ttl = windowSeconds;
    }

    const allowed = count <= max;
    return { allowed, count, retryAfterSeconds: allowed ? 0 : ttl };
  }

  /**
   * Read the current counter without incrementing (for "lockout" semantics
   * where you want to refuse before counting).
   */
  async peek(key: string): Promise<{ count: number; ttlSeconds: number }> {
    const fullKey = `rl:${key}`;
    const [count, ttl] = await Promise.all([
      this.redis.client.get(fullKey).then((v) => (v ? Number(v) : 0)),
      this.redis.client.ttl(fullKey),
    ]);
    return { count, ttlSeconds: ttl > 0 ? ttl : 0 };
  }

  async reset(key: string): Promise<void> {
    await this.redis.client.del(`rl:${key}`);
  }
}

import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

/**
 * Tracks "how many times has viewer X seen candidate Y in the last 24h".
 * Lives in Redis with a 24h TTL — the recency penalty in §7.3's ranking
 * formula reads this counter. INCR-on-render so a card flipping past gets
 * counted once.
 */
@Injectable()
export class FeedShownService {
  private readonly TTL_S = 24 * 60 * 60;

  constructor(private readonly redis: RedisService) {}

  private key(viewer: string, candidate: string): string {
    return `feed:shown:${viewer}:${candidate}`;
  }

  async readMany(viewerId: string, candidateIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (candidateIds.length === 0) return map;
    const keys = candidateIds.map((c) => this.key(viewerId, c));
    const vals = await this.redis.client.mget(...keys);
    candidateIds.forEach((c, i) => {
      map.set(c, vals[i] ? Number(vals[i]) : 0);
    });
    return map;
  }

  async markShown(viewerId: string, candidateIds: string[]): Promise<void> {
    if (candidateIds.length === 0) return;
    const pipe = this.redis.client.multi();
    for (const c of candidateIds) {
      pipe.incr(this.key(viewerId, c));
      pipe.expire(this.key(viewerId, c), this.TTL_S);
    }
    await pipe.exec();
  }
}

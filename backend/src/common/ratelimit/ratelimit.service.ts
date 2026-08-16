import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Fixed-window rate limiting, in-process. Same `hit()`/`peek()`/`reset()`
 * shape as the old Redis-backed version — single-process deploy on
 * Hostinger makes an in-memory Map correct.
 *
 * Bucket = `{ count, windowEndsAt }`. Expiry is lazy on read + a periodic
 * sweep so the map doesn't grow forever under weird key patterns.
 */
type Bucket = { count: number; windowEndsAtMs: number };

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly buckets = new Map<string, Bucket>();
  private readonly sweep: NodeJS.Timeout;

  constructor() {
    // Sweep expired buckets every 5 minutes. `unref` so the interval
    // doesn't keep the process alive during tests.
    this.sweep = setInterval(() => this.gc(), 5 * 60 * 1000);
    this.sweep.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.sweep);
  }

  async hit(
    key: string,
    max: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; count: number; retryAfterSeconds: number }> {
    const now = Date.now();
    const b = this.buckets.get(key);

    if (!b || b.windowEndsAtMs <= now) {
      const fresh: Bucket = { count: 1, windowEndsAtMs: now + windowSeconds * 1000 };
      this.buckets.set(key, fresh);
      return { allowed: 1 <= max, count: 1, retryAfterSeconds: 0 };
    }

    b.count += 1;
    const allowed = b.count <= max;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(1, Math.ceil((b.windowEndsAtMs - now) / 1000));
    return { allowed, count: b.count, retryAfterSeconds };
  }

  async peek(key: string): Promise<{ count: number; ttlSeconds: number }> {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.windowEndsAtMs <= now) return { count: 0, ttlSeconds: 0 };
    return {
      count: b.count,
      ttlSeconds: Math.max(0, Math.ceil((b.windowEndsAtMs - now) / 1000)),
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  /** Test-only — clear every bucket. Called from cleanDb() between specs. */
  resetAll(): void {
    this.buckets.clear();
  }

  private gc() {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (b.windowEndsAtMs <= now) this.buckets.delete(k);
    }
  }
}

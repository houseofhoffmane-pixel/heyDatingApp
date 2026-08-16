import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Tracks "how many times has viewer X seen candidate Y in the last 24h".
 * The recency-penalty term in the ranking formula reads this counter.
 * INCR-on-render so a card flipping past gets counted once.
 *
 * Was Redis-backed pre-Sprint-2 (`feed:shown:<viewer>:<candidate>` with
 * TTL 24h). Single-process deploy on Hostinger lets us keep it in an
 * in-memory Map. Cap set to 100k entries with lazy expiry + periodic
 * sweep so long-lived processes don't drift.
 */
type Bucket = { count: number; expiresAtMs: number };

@Injectable()
export class FeedShownService implements OnModuleDestroy {
  private readonly TTL_MS = 24 * 60 * 60 * 1000;
  private readonly MAX_ENTRIES = 100_000;
  private readonly buckets = new Map<string, Bucket>();
  private readonly sweep: NodeJS.Timeout;

  constructor() {
    this.sweep = setInterval(() => this.gc(), 10 * 60 * 1000);
    this.sweep.unref?.();
  }

  onModuleDestroy() {
    clearInterval(this.sweep);
  }

  private key(viewer: string, candidate: string): string {
    return `${viewer}:${candidate}`;
  }

  async readMany(viewerId: string, candidateIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (candidateIds.length === 0) return map;
    const now = Date.now();
    for (const c of candidateIds) {
      const b = this.buckets.get(this.key(viewerId, c));
      map.set(c, b && b.expiresAtMs > now ? b.count : 0);
    }
    return map;
  }

  async markShown(viewerId: string, candidateIds: string[]): Promise<void> {
    if (candidateIds.length === 0) return;
    const now = Date.now();
    for (const c of candidateIds) {
      const k = this.key(viewerId, c);
      const existing = this.buckets.get(k);
      if (existing && existing.expiresAtMs > now) {
        existing.count += 1;
        existing.expiresAtMs = now + this.TTL_MS;
      } else {
        this.buckets.set(k, { count: 1, expiresAtMs: now + this.TTL_MS });
      }
    }
    // Cheap safety valve — if we've blown past the cap, run gc immediately.
    if (this.buckets.size > this.MAX_ENTRIES) this.gc();
  }

  /** Test-only — clear the cache between specs. */
  resetAll(): void {
    this.buckets.clear();
  }

  private gc() {
    const now = Date.now();
    for (const [k, b] of this.buckets) {
      if (b.expiresAtMs <= now) this.buckets.delete(k);
    }
  }
}

import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { loadEnv } from '../config/env';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Thin wrapper around ioredis. Exposes the underlying client so feature
 * modules can do whatever Redis op they need (counters, presence, BullMQ,
 * socket.io adapter). Lifecycle is managed here so we don't leak
 * connections during tests.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly extras: Redis[] = [];

  constructor(@Inject(REDIS_CLIENT) public readonly client: Redis) {}

  /**
   * Some integrations need their own dedicated connection — Socket.IO's
   * Redis adapter wants two (pub + sub) and BullMQ wants one per worker.
   * `duplicate()` opens a fresh client to the same URL and tracks it for
   * orderly shutdown.
   */
  duplicate(): Redis {
    const c = new Redis(loadEnv().REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.extras.push(c);
    return c;
  }

  async onModuleDestroy() {
    for (const c of this.extras) {
      try { c.disconnect(); } catch { /* ignore */ }
    }
    try { this.client.disconnect(); } catch { /* ignore */ }
  }
}

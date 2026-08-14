import type { ConnectionOptions } from 'bullmq';
import { loadEnv } from '../config/env';

/**
 * BullMQ wants its own Redis connection per Queue and per Worker — sharing
 * the API's ioredis client breaks reliable blocking commands. Returning
 * plain ConnectionOptions lets BullMQ open and own them.
 */
export function bullmqConnection(): ConnectionOptions {
  const url = new URL(loadEnv().REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
  };
}

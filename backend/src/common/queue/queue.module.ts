import { Global, Module } from '@nestjs/common';
import { bullmqConnection } from './bullmq.connection';

export const BULLMQ_CONNECTION = Symbol('BULLMQ_CONNECTION');

/**
 * Exposes the BullMQ connection-options factory globally so any feature
 * module can register its own Queue / Worker without re-importing config.
 *
 * Workers run *in-process* for v1 (simpler ops). To split them out, run a
 * second instance of this binary with WORKERS_ONLY=1 and have main.ts
 * skip controller registration — the same Worker classes spin up.
 */
@Global()
@Module({
  providers: [
    {
      provide: BULLMQ_CONNECTION,
      useFactory: () => bullmqConnection,
    },
  ],
  exports: [BULLMQ_CONNECTION],
})
export class QueueModule {}

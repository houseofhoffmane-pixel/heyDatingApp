import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';
import { loadEnv } from '../config/env';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const env = loadEnv();
        return new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: null,
          lazyConnect: false,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}

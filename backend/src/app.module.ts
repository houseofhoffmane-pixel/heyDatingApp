import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { GeoModule } from './common/geo/geo.module';
import { RedisModule } from './common/redis/redis.module';
import { RateLimitModule } from './common/ratelimit/ratelimit.module';
import { ProfileModule } from './common/profile/profile.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from './modules/storage/storage.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PhotosModule } from './modules/photos/photos.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { LikesModule } from './modules/likes/likes.module';
import { MatchesModule } from './modules/matches/matches.module';
import { ChatModule } from './modules/chat/chat.module';
import { PushModule } from './modules/push/push.module';
import { DevicesModule } from './modules/devices/devices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SafetyModule } from './modules/safety/safety.module';
import { MeModule } from './modules/me/me.module';
import { HealthController } from './health.controller';

/**
 * Root module. Ship-scope feature set — no spots, events, verification,
 * geocoding, admin, or BullMQ queue (all removed in Sprint 1).
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Serve the built web frontend from backend/public. Path anchored to
    // __dirname so it works whether Hostinger launches Node from the repo
    // root or from backend/. From backend/dist/app.module.js → ../public.
    // `exclude` keeps API + WS routes out of the SPA fallback.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/rt*'],
      serveStaticOptions: {
        fallthrough: true,
        index: 'index.html',
      },
    }),
    PrismaModule,
    RedisModule,          // Sprint 2 removes this
    RateLimitModule,
    GeoModule,
    ProfileModule,
    StorageModule,
    AuthModule,
    OnboardingModule,
    PhotosModule,
    DiscoveryModule,
    RealtimeModule,
    PushModule,
    NotificationsModule,
    DevicesModule,
    LikesModule,
    MatchesModule,
    ChatModule,
    SafetyModule,
    MeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

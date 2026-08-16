import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { GeoModule } from './common/geo/geo.module';
import { RedisModule } from './common/redis/redis.module';
import { RateLimitModule } from './common/ratelimit/ratelimit.module';
import { QueueModule } from './common/queue/queue.module';
import { ProfileModule } from './common/profile/profile.module';
import { AuthModule } from './modules/auth/auth.module';
import { StorageModule } from './modules/storage/storage.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { PhotosModule } from './modules/photos/photos.module';
import { VerificationModule } from './modules/verification/verification.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { LikesModule } from './modules/likes/likes.module';
import { MatchesModule } from './modules/matches/matches.module';
import { ChatModule } from './modules/chat/chat.module';
import { PushModule } from './modules/push/push.module';
import { PlacesModule } from './modules/places/places.module';
import { EventsModule } from './modules/events/events.module';
import { DevicesModule } from './modules/devices/devices.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SafetyModule } from './modules/safety/safety.module';
import { MeModule } from './modules/me/me.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Serve the built web frontend from backend/public. In production the
    // root build script (npm run build:web) copies web/dist here, so one
    // Node process serves the SPA + the API (/api/v1/*) + the WS (/rt).
    //
    // Path is anchored to the compiled file location (__dirname) rather
    // than process.cwd() so it works whether Hostinger launches Node from
    // the repo root (`node backend/dist/main.js`) or from `backend/`.
    // From backend/dist/app.module.js → ../public = backend/public. ✓
    //
    // `exclude` keeps API + WS routes out of the SPA fallback that
    // returns index.html for any unknown path (React Router deep-links
    // like /discover, /chats/abc).
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/rt*'],
      serveStaticOptions: {
        fallthrough: true,
        index: 'index.html',
      },
    }),
    PrismaModule,
    RedisModule,
    RateLimitModule,
    QueueModule,
    GeoModule,
    ProfileModule,
    StorageModule,
    AuthModule,
    OnboardingModule,
    PhotosModule,
    VerificationModule,
    DiscoveryModule,
    RealtimeModule,
    PushModule,
    NotificationsModule, // before LikesModule etc. — they inject it
    DevicesModule,
    LikesModule,
    MatchesModule,
    ChatModule,
    PlacesModule,
    EventsModule,
    SafetyModule,
    MeModule,
    GeocodingModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

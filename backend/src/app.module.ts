import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { GeoModule } from './common/geo/geo.module';
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
 * geocoding, admin, or BullMQ queue (removed in Sprint 1). No Redis —
 * presence, rate limits, feed-shown cache, and cron locks all live
 * in-process (Sprint 2). Single Node process serves API + WS + SPA.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Serve the built web frontend from backend/public. Path anchored to
    // __dirname so it works whether Hostinger launches Node from the repo
    // root or from backend/. From backend/dist/app.module.js → ../public.
    //
    // Two-layer serve:
    //   - Assets (hashed filenames under /assets/*) hit express.static and
    //     return the file. Vite emits content-hashed filenames, so a
    //     1-year immutable cache is safe.
    //   - Everything else (deep SPA routes like /discover, /chats/:id)
    //     falls through to `renderPath`, which returns index.html so the
    //     React router can hydrate.
    // `exclude` keeps /api* and /rt* out of both layers.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*', '/rt*'],
      renderPath: /^(?!\/api|\/rt)(.*)/,
      serveStaticOptions: {
        fallthrough: true,
        index: 'index.html',
        setHeaders: (res, filePath) => {
          if (/[.-][0-9a-f]{8,}\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|avif|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      },
    }),
    PrismaModule,
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

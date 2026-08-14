import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from '../auth/auth.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminJwtStrategy } from './auth/admin-jwt.strategy';
import { AdminRoleGuard } from './auth/admin-jwt.guard';
import { AuditService } from './audit.service';
import { AdminPlacesService } from './admin-places.service';
import { AdminEventsService } from './admin-events.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminCatalogsService } from './admin-catalogs.service';
import { AdminConfigService } from './admin-config.service';
import { AdminMetricsService } from './admin-metrics.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    AuthModule,       // TokensService for revoke-on-ban
    GeocodingModule,  // for places/events address → coords
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    AdminRoleGuard,
    AuditService,
    AdminPlacesService,
    AdminEventsService,
    AdminModerationService,
    AdminCatalogsService,
    AdminConfigService,
    AdminMetricsService,
  ],
})
export class AdminModule {}

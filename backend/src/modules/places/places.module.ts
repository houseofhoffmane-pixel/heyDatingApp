import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { CheckinService } from './checkin.service';
import { CheckinExpiryProcessor } from './jobs/checkin-expiry.processor';
import { PlacesGateway } from './places.gateway';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, CheckinService, CheckinExpiryProcessor, PlacesGateway],
  exports: [PlacesService, CheckinService],
})
export class PlacesModule {}

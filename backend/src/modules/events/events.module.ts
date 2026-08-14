import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [PlacesModule], // for CheckinService — events use the same checkins table
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

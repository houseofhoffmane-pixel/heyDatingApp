import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { FiltersController } from './filters.controller';
import { DiscoveryService } from './discovery.service';
import { FiltersService } from './filters.service';
import { FeedShownService } from './feed-shown.service';

@Module({
  controllers: [DiscoveryController, FiltersController],
  providers: [DiscoveryService, FiltersService, FeedShownService],
  exports: [DiscoveryService, FiltersService],
})
export class DiscoveryModule {}

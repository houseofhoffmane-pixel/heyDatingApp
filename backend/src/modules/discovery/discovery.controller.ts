import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { FeedQueryDto } from './dto/feed-query.dto';
import { UpdateLocationDto } from './dto/location.dto';

@Controller()
export class DiscoveryController {
  constructor(private readonly svc: DiscoveryService) {}

  @Get('discovery/feed')
  feed(@CurrentUserId() viewerId: string, @Query() query: FeedQueryDto) {
    return this.svc.feed(viewerId, query);
  }

  @Get('discovery/profile/:userId')
  profile(@CurrentUserId() viewerId: string, @Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.svc.profileDetail(viewerId, userId);
  }

  /**
   * Location is needed by the feed (distance filter) and the check-in flow
   * (Step 8). Lives in the discovery module for now — moves under `/me`
   * during Step 11 when the rest of the self-management endpoints land.
   */
  @Put('me/location')
  updateLocation(@CurrentUserId() userId: string, @Body() body: UpdateLocationDto) {
    return this.svc.updateLocation(userId, body);
  }
}

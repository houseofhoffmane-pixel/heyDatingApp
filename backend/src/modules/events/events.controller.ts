import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CheckinService } from '../places/checkin.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { ListEventsDto } from './dto/list-events.dto';
import { GoingQueryDto } from './dto/going-query.dto';
import { CheckinDto } from '../places/dto/checkin.dto';

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly checkins: CheckinService,
  ) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: ListEventsDto) {
    return this.events.list(userId, query);
  }

  @Get(':id')
  detail(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.detail(userId, id);
  }

  @Get(':id/going')
  going(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: GoingQueryDto,
  ) {
    return this.events.going(userId, id, query);
  }

  @Post(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  rsvp(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.rsvp(userId, id);
  }

  @Delete(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  cancelRsvp(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.cancelRsvp(userId, id);
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.CREATED)
  checkin(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CheckinDto,
  ) {
    return this.checkins.checkInAtEvent(userId, id, body.lat, body.lng);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  leave(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.checkins.leaveEvent(userId, id);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  save(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.save(userId, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  unsave(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.unsave(userId, id);
  }
}

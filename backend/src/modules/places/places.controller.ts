import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';
import { PlacesService } from './places.service';
import { CheckinService } from './checkin.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { ListPlacesDto } from './dto/list-places.dto';
import { CheckinDto } from './dto/checkin.dto';
import { RequestPlaceDto } from './dto/request-place.dto';

/**
 * Note on the `requests` endpoint — spec writes `POST /places/:id/request`
 * but a *new* venue suggestion has no existing id. We expose it as
 * `POST /places/requests` (no :id), which matches the user-suggested
 * venues queue admins drain in Step 12.
 */
@Controller('places')
export class PlacesController {
  constructor(
    private readonly places: PlacesService,
    private readonly checkins: CheckinService,
  ) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: ListPlacesDto) {
    return this.places.list(userId, query);
  }

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  requestPlace(@CurrentUserId() userId: string, @Body() body: RequestPlaceDto) {
    return this.places.requestPlace(userId, body);
  }

  @Get(':id')
  detail(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.places.detail(userId, id);
  }

  @Post(':id/checkin')
  @HttpCode(HttpStatus.CREATED)
  checkin(
    @CurrentUserId() userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CheckinDto,
  ) {
    return this.checkins.checkInAtPlace(userId, id, body.lat, body.lng);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  leave(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.checkins.leavePlace(userId, id);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  save(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.places.save(userId, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  unsave(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.places.unsave(userId, id);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { ListNotificationsDto, MarkNotificationsReadDto } from './dto/list-notifications.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: ListNotificationsDto) {
    return this.svc.list(userId, query);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUserId() userId: string, @Body() body: MarkNotificationsReadDto) {
    return this.svc.markRead(userId, body);
  }
}

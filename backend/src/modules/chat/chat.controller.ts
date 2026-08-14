import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkReadDto } from './dto/mark-read.dto';

/**
 * REST is the durable surface — WS is the live-update surface. They share
 * the same idempotency contract (clientId) so an offline client that can't
 * reach the socket falls back to POST here and dedupes the same way.
 */
@Controller('matches/:matchId')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  @Get('messages')
  list(
    @CurrentUserId() userId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.svc.listHistory(userId, matchId, query);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  send(
    @CurrentUserId() userId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.svc.sendMessage(userId, matchId, body);
  }

  @Post('read')
  @HttpCode(HttpStatus.OK)
  read(
    @CurrentUserId() userId: string,
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
    @Body() body: MarkReadDto,
  ) {
    return this.svc.markRead(userId, matchId, body.upToMessageId);
  }
}

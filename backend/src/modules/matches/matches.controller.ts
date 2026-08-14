import { Controller, Delete, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';

@Controller('matches')
export class MatchesController {
  constructor(private readonly svc: MatchesService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.svc.list(userId);
  }

  @Delete(':id')
  unmatch(@CurrentUserId() userId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.unmatch(userId, id);
  }
}

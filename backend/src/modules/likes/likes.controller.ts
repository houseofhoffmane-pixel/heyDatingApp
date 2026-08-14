import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LikesService } from './likes.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { CreateLikeDto } from './dto/create-like.dto';
import { CreatePassDto } from './dto/create-pass.dto';

@Controller()
export class LikesController {
  constructor(private readonly svc: LikesService) {}

  @Post('likes')
  @HttpCode(HttpStatus.OK)
  createLike(@CurrentUserId() userId: string, @Body() body: CreateLikeDto) {
    return this.svc.createLike(userId, body);
  }

  @Post('passes')
  @HttpCode(HttpStatus.OK)
  createPass(@CurrentUserId() userId: string, @Body() body: CreatePassDto) {
    return this.svc.createPass(userId, body);
  }

  @Get('likes/received')
  received(@CurrentUserId() userId: string) {
    return this.svc.receivedLikes(userId);
  }
}

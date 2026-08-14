import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { VerificationUploadUrlDto } from './dto/upload-url.dto';
import { VerificationSubmitDto } from './dto/submit.dto';

@Controller('verification')
export class VerificationController {
  constructor(private readonly svc: VerificationService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  uploadUrl(@CurrentUserId() userId: string, @Body() body: VerificationUploadUrlDto) {
    return this.svc.uploadUrl(userId, body);
  }

  @Post('submit')
  @HttpCode(HttpStatus.ACCEPTED)
  submit(@CurrentUserId() userId: string, @Body() body: VerificationSubmitDto) {
    return this.svc.submit(userId, body);
  }

  @Get('status')
  status(@CurrentUserId() userId: string) {
    return this.svc.status(userId);
  }
}

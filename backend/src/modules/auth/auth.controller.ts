import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { OtpRequestDto } from './dto/otp-request.dto';
import { OtpVerifyDto } from './dto/otp-verify.dto';
import { RefreshDto } from './dto/refresh.dto';
import { EmailLoginDto } from './dto/email-login.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUserId } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  async otpRequest(@Body() body: OtpRequestDto, @Req() req: Request) {
    return this.auth.otpRequest(body.phone_e164, { ip: extractIp(req) });
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async otpVerify(@Body() body: OtpVerifyDto, @Req() req: Request) {
    return this.auth.otpVerify(body.phone_e164, body.code, {
      ip: extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(body.refreshToken, {
      ip: extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('signup/email')
  @HttpCode(HttpStatus.OK)
  async signupEmail(@Body() body: EmailLoginDto, @Req() req: Request) {
    return this.auth.signupEmail(body.email, body.password, {
      ip: extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  async loginEmail(@Body() body: EmailLoginDto, @Req() req: Request) {
    return this.auth.loginEmail(body.email, body.password, {
      ip: extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUserId() userId: string, @Body() body: Partial<RefreshDto>) {
    return this.auth.logout(userId, body?.refreshToken);
  }
}

function extractIp(req: Request): string | undefined {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip;
}

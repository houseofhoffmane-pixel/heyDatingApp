import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OTP_PROVIDER } from './providers/otp.provider';
import { OtpStubProvider } from './providers/otp.stub.provider';
import { OtpTwilioProvider } from './providers/otp.twilio.provider';
import { loadEnv } from '../../common/config/env';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokensService,
    JwtStrategy,
    {
      provide: OTP_PROVIDER,
      useClass: loadEnv().TWILIO_PROVIDER === 'real' ? OtpTwilioProvider : OtpStubProvider,
    },
    // Global guard: every route is JWT-protected by default; `@Public()` opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, TokensService],
})
export class AuthModule {}

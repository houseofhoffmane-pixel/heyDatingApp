import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { AdminAuthService } from './admin-auth.service';
import { Public } from '../../auth/decorators/public.decorator';

class AdminLoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly svc: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: AdminLoginDto) {
    return this.svc.login(body.email, body.password);
  }
}

import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  register(@CurrentUserId() userId: string, @Body() body: RegisterDeviceDto) {
    return this.svc.register(userId, body);
  }

  @Delete(':token')
  @HttpCode(HttpStatus.OK)
  unregister(@CurrentUserId() userId: string, @Param('token') token: string) {
    return this.svc.unregister(userId, token);
  }
}

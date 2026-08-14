import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

/**
 * Manages the user's FCM registration tokens.
 *
 * Tokens can rotate at any time (app update, OS reset). We upsert on
 * `(user_id, fcm_token)` so re-registering is cheap, and PushService
 * removes tokens that FCM reports as `UNREGISTERED` after a send.
 */
@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceDto) {
    await this.prisma.deviceToken.upsert({
      where: { userId_fcmToken: { userId, fcmToken: dto.fcmToken } },
      create: { userId, fcmToken: dto.fcmToken, platform: dto.platform, lastSeen: new Date() },
      update: { platform: dto.platform, lastSeen: new Date() },
    });
    return { ok: true };
  }

  async unregister(userId: string, fcmToken: string) {
    await this.prisma.deviceToken.deleteMany({
      where: { userId, fcmToken },
    });
    return { ok: true };
  }
}

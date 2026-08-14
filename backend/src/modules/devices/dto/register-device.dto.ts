import { IsIn, IsString, MaxLength } from 'class-validator';

const PLATFORMS = ['ios', 'android', 'web'] as const;

export class RegisterDeviceDto {
  /** FCM registration token from Firebase SDK on the client. */
  @IsString() @MaxLength(4096) fcmToken!: string;
  @IsIn(PLATFORMS as readonly string[])
  platform!: (typeof PLATFORMS)[number];
}

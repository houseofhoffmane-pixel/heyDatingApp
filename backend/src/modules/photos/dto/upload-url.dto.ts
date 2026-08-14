import { IsIn, IsString } from 'class-validator';

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'] as const;

export class UploadUrlDto {
  @IsString() @IsIn(ALLOWED as readonly string[])
  contentType!: (typeof ALLOWED)[number];
}

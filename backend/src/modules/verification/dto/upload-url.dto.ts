import { IsIn, IsString } from 'class-validator';

const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

export class VerificationUploadUrlDto {
  @IsString() @IsIn(ALLOWED as readonly string[])
  contentType!: (typeof ALLOWED)[number];
}

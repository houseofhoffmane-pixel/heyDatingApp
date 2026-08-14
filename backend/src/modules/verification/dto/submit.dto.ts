import { IsString } from 'class-validator';

export class VerificationSubmitDto {
  @IsString() selfieS3Key!: string;
}

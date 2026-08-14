import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ConfirmPhotoDto {
  @IsString() s3Key!: string;
  /** 0 = main, 1..5 = secondary slots. */
  @IsOptional() @IsInt() @Min(0) @Max(5) position?: number;
}

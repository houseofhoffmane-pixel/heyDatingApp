import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const VISIBILITIES = ['everyone', 'liked_only', 'spot_only'] as const;

export class PutSettingsDto {
  @IsOptional() @IsBoolean() notifyMatches?: boolean;
  @IsOptional() @IsBoolean() notifyMessages?: boolean;
  @IsOptional() @IsBoolean() notifyLikes?: boolean;
  @IsOptional() @IsBoolean() notifyPlaces?: boolean;
  @IsOptional() @IsBoolean() notifyEvents?: boolean;
  @IsOptional() @IsBoolean() notifyNews?: boolean;
  @IsOptional() @IsBoolean() emailDigest?: boolean;

  @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursStart?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(23) quietHoursEnd?: number | null;

  @IsOptional() @IsBoolean() readReceipts?: boolean;
  @IsOptional() @IsBoolean() activeStatus?: boolean;
  @IsOptional() @IsBoolean() blurExplicit?: boolean;
  @IsOptional() @IsBoolean() showMeOnPlaces?: boolean;

  /** Account-level "who sees me". Lives on `users.visibility`. */
  @IsOptional() @IsIn(VISIBILITIES as readonly string[])
  visibility?: (typeof VISIBILITIES)[number];
}

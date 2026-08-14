import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString,
  IsUUID, Length, Max, Min, ValidateIf,
} from 'class-validator';

// ── Places ────────────────────────────────────────────────────

export class CreateAdminPlaceDto {
  @IsString() @Length(1, 80) label!: string;
  @IsString() @Length(1, 30) kind!: string;
  @IsString() @Length(1, 200) vibe!: string;
  @IsString() @Length(1, 200) address!: string;
  @IsString() @Length(1, 30) icon!: string;
  @IsString() @Length(1, 20) tone!: string;
  @IsUUID('all') cityId!: string;
  @IsOptional() @IsBoolean() hot?: boolean;
}

export class UpdateAdminPlaceDto {
  @IsOptional() @IsString() @Length(1, 80) label?: string;
  @IsOptional() @IsString() @Length(1, 30) kind?: string;
  @IsOptional() @IsString() @Length(1, 200) vibe?: string;
  @IsOptional() @IsString() @Length(1, 200) address?: string;
  @IsOptional() @IsString() @Length(1, 30) icon?: string;
  @IsOptional() @IsString() @Length(1, 20) tone?: string;
  @IsOptional() @IsBoolean() hot?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ActionPlaceRequestDto {
  @IsIn(['approve', 'dismiss']) action!: 'approve' | 'dismiss';
}

// ── Events ────────────────────────────────────────────────────

export class CreateAdminEventDto {
  @IsString() @Length(1, 100) title!: string;
  @IsString() @Length(1, 80)  host!: string;
  @IsString() @Length(1, 200) vibe!: string;
  @IsOptional() @IsUUID('all') placeId?: string;
  /** Required if placeId is absent. */
  @ValidateIf((o) => !o.placeId) @IsString() @Length(1, 200) address?: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsString() @Length(1, 80) doorText!: string;
  @IsString() @Length(1, 30) coverText!: string;
  @IsUUID('all') cityId!: string;
  @IsArray() @IsString({ each: true }) tags!: string[];
  @IsString() @Length(1, 30) icon!: string;
  @IsString() @Length(1, 20) tone!: string;
  @IsOptional() @IsBoolean() hot?: boolean;
}

export class UpdateAdminEventDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() host?: string;
  @IsOptional() @IsString() vibe?: string;
  @IsOptional() @IsUUID('all') placeId?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() doorText?: string;
  @IsOptional() @IsString() coverText?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() tone?: string;
  @IsOptional() @IsBoolean() hot?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

// ── Reports moderation ───────────────────────────────────────

export class ActionReportDto {
  @IsIn(['warn', 'ban', 'remove', 'dismiss'])
  action!: 'warn' | 'ban' | 'remove' | 'dismiss';
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}

export class ListReportsDto {
  @IsOptional() @IsIn(['pending', 'reviewed', 'actioned', 'dismissed'])
  status?: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  limit: number = 50;
  @IsOptional() @IsString() cursor?: string;
}

// ── Verifications manual review ──────────────────────────────

export class ActionVerificationDto {
  @IsIn(['approve', 'reject']) action!: 'approve' | 'reject';
  @IsOptional() @IsString() @Length(1, 200) reason?: string;
}

// ── Users ─────────────────────────────────────────────────────

export class BanUserDto {
  @IsOptional() @IsString() @Length(1, 500) note?: string;
}

// ── Catalogs ──────────────────────────────────────────────────

export class CreatePromptDto {
  @IsString() @Length(1, 200) text!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePromptDto {
  @IsOptional() @IsString() @Length(1, 200) text?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpsertInterestDto {
  @IsString() @Length(1, 50) slug!: string;
  @IsString() @Length(1, 80) label!: string;
  @IsString() @Length(1, 50) category!: string;
}

export class CreateCityDto {
  @IsString() @Length(1, 30) slug!: string;
  @IsString() @Length(1, 80) name!: string;
  @IsString() @Length(2, 4) country!: string;
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) radiusKm?: number;
}

export class UpdateCityDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsNumber() lat?: number;
  @IsOptional() @IsNumber() lng?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500) radiusKm?: number;
}

// ── Feed weights ──────────────────────────────────────────────

export class PutFeedWeightsDto {
  @IsOptional() @IsNumber() wRecency?: number;
  @IsOptional() @IsNumber() wMutualInterests?: number;
  @IsOptional() @IsNumber() wSameSpot?: number;
  @IsOptional() @IsNumber() wDistance?: number;
  @IsOptional() @IsNumber() wReciprocal?: number;
  @IsOptional() @IsNumber() wRecentlyShownPenalty?: number;
}

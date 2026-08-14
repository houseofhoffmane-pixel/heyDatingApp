import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt,
  IsOptional, IsString, Length, Max, Min, ValidateNested,
} from 'class-validator';
import {
  ENUM_DRINKS, ENUM_EXERCISE, ENUM_GENDER, ENUM_KIDS, ENUM_LOOKING_FOR,
  ENUM_MONOGAMY, ENUM_POLITICS, ENUM_RELATIONSHIP, ENUM_RELIGION,
  ENUM_SMOKES, ENUM_STAR_SIGN, ENUM_WEED,
} from '../../../common/profile/profile-shaper';

/**
 * Lifestyle / values are sent as sub-objects per spec §4.1, but each inner
 * field is independently optional so the client can submit them one at a
 * time as the user moves through the lifestyle/values onboarding screens.
 */
export class LifestyleDto {
  @IsOptional() @IsIn(ENUM_DRINKS as readonly string[])   drinks?: (typeof ENUM_DRINKS)[number];
  @IsOptional() @IsIn(ENUM_SMOKES as readonly string[])   smokes?: (typeof ENUM_SMOKES)[number];
  @IsOptional() @IsIn(ENUM_EXERCISE as readonly string[]) exercise?: (typeof ENUM_EXERCISE)[number];
  @IsOptional() @IsIn(ENUM_WEED as readonly string[])     weed420?: (typeof ENUM_WEED)[number];
}

export class ValuesDto {
  @IsOptional() @IsIn(ENUM_KIDS as readonly string[])     kids?: (typeof ENUM_KIDS)[number];
  @IsOptional() @IsIn(ENUM_POLITICS as readonly string[]) politics?: (typeof ENUM_POLITICS)[number];
  @IsOptional() @IsIn(ENUM_RELIGION as readonly string[]) religion?: (typeof ENUM_RELIGION)[number];
  @IsOptional() @IsIn(ENUM_MONOGAMY as readonly string[]) monogamy?: (typeof ENUM_MONOGAMY)[number];
}

export class PatchProfileDto {
  // ── user table fields (dob + age_confirmed) ───────────────────
  /** YYYY-MM-DD. Server recomputes age, rejects < 18. */
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsBoolean()    ageConfirmed?: boolean;

  // ── profile table fields ──────────────────────────────────────
  @IsOptional() @IsString() @Length(1, 40)  name?: string;
  @IsOptional() @IsIn(ENUM_GENDER as readonly string[]) gender?: (typeof ENUM_GENDER)[number];
  @IsOptional() @IsString() @Length(1, 80)  genderCustom?: string;

  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4)
  @IsIn(ENUM_LOOKING_FOR as readonly string[], { each: true })
  lookingFor?: (typeof ENUM_LOOKING_FOR)[number][];

  @IsOptional() @IsIn(ENUM_RELATIONSHIP as readonly string[])
  relationshipIntent?: (typeof ENUM_RELATIONSHIP)[number];

  @IsOptional() @IsInt() @Min(120) @Max(230) heightCm?: number;

  @IsOptional() @IsString() @Length(1, 180) bio?: string;
  @IsOptional() @IsString() @Length(1, 80)  job?: string;
  @IsOptional() @IsString() @Length(1, 80)  school?: string;
  @IsOptional() @IsString() @Length(1, 40)  pronouns?: string;
  @IsOptional() @IsIn(ENUM_STAR_SIGN as readonly string[]) starSign?: (typeof ENUM_STAR_SIGN)[number];

  @IsOptional() @ValidateNested() @Type(() => LifestyleDto) lifestyle?: LifestyleDto;
  @IsOptional() @ValidateNested() @Type(() => ValuesDto)    values?: ValuesDto;
}

import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, Max, Min,
} from 'class-validator';
import {
  ENUM_DRINKS, ENUM_EXERCISE, ENUM_KIDS, ENUM_LOOKING_FOR,
  ENUM_MONOGAMY, ENUM_POLITICS, ENUM_RELATIONSHIP, ENUM_RELIGION,
  ENUM_SMOKES, ENUM_STAR_SIGN, ENUM_WEED,
} from '../../../common/profile/profile-shaper';

/**
 * Body for PUT /filters. Every field optional — sending `{}` keeps the
 * current row untouched. Sending an empty array clears that constraint.
 */
export class PutFiltersDto {
  @IsOptional() @IsArray() @ArrayMaxSize(4)
  @IsIn(ENUM_LOOKING_FOR as readonly string[], { each: true })
  lookingFor?: (typeof ENUM_LOOKING_FOR)[number][];

  @IsOptional() @IsInt() @Min(18) @Max(99)  ageMin?: number;
  @IsOptional() @IsInt() @Min(18) @Max(99)  ageMax?: number;
  @IsOptional() @IsInt() @Min(120) @Max(230) heightMinCm?: number;
  @IsOptional() @IsInt() @Min(120) @Max(230) heightMaxCm?: number;
  @IsOptional() @IsInt() @Min(1) @Max(500)   distanceMi?: number;

  @IsOptional() @IsArray() @IsIn(ENUM_RELATIONSHIP as readonly string[], { each: true })
  relationship?: (typeof ENUM_RELATIONSHIP)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_DRINKS as readonly string[], { each: true })
  drinks?: (typeof ENUM_DRINKS)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_SMOKES as readonly string[], { each: true })
  smokes?: (typeof ENUM_SMOKES)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_EXERCISE as readonly string[], { each: true })
  exercise?: (typeof ENUM_EXERCISE)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_WEED as readonly string[], { each: true })
  weed420?: (typeof ENUM_WEED)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_KIDS as readonly string[], { each: true })
  kids?: (typeof ENUM_KIDS)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_POLITICS as readonly string[], { each: true })
  politics?: (typeof ENUM_POLITICS)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_RELIGION as readonly string[], { each: true })
  religion?: (typeof ENUM_RELIGION)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_MONOGAMY as readonly string[], { each: true })
  monogamy?: (typeof ENUM_MONOGAMY)[number][];

  @IsOptional() @IsArray() @IsIn(ENUM_STAR_SIGN as readonly string[], { each: true })
  starSign?: (typeof ENUM_STAR_SIGN)[number][];

  @IsOptional() @IsArray()  interests?: string[]; // interest *slugs*

  @IsOptional() @IsBoolean() showMeOnPlaces?: boolean;
}

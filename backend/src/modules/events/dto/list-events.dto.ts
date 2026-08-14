import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

const FILTERS = ['tonight', 'this-week', 'free', 'saved', 'rsvpd'] as const;

export class ListEventsDto {
  /** City slug or city id. Defaults to all if omitted. */
  @IsOptional() @IsUUID('all') cityId?: string;

  @IsOptional() @IsIn(FILTERS as readonly string[])
  filter?: (typeof FILTERS)[number];

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 50;

  @IsOptional() @IsString() cursor?: string;
}

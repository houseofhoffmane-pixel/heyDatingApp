import { Transform, Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const VIEWS = ['map', 'list'] as const;

export class ListPlacesDto {
  @IsOptional() @IsIn(VIEWS as readonly string[])
  view: (typeof VIEWS)[number] = 'list';

  /** Comma-separated kinds: coffee,cocktail,gym,wine-bar,live-music,park,bookshop,pizza */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value))
  @IsArray() @IsString({ each: true })
  filters?: string[];

  /** "lat,lng". If omitted the user's profile location is used. */
  @IsOptional() @IsString() @Matches(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, { message: 'near must be "lat,lng"' })
  near?: string;

  /** Radius in km for the map/list query. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  radiusKm: number = 25;
}

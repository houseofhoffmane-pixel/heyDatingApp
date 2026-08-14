import { IsOptional, IsString, Length } from 'class-validator';

export class RequestPlaceDto {
  @IsString() @Length(1, 80)  label!: string;
  @IsOptional() @IsString() @Length(1, 200) address?: string;
  /** Why this place belongs on Hey — admin reads this. */
  @IsString() @Length(10, 500) detail!: string;
}

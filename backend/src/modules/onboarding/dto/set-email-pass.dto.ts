import { IsEmail, IsString, MinLength } from 'class-validator';

export class SetEmailPassDto {
  @IsEmail() email!: string;
  /** Mirrors the onboarding UI: 8+ chars. Strength is informational. */
  @IsString() @MinLength(8) password!: string;
}

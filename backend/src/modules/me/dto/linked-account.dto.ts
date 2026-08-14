import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class ConnectLinkedAccountDto {
  @IsString() @Length(1, 80) handle!: string;
  /** Optional provider-specific payload (e.g. top track for Spotify). */
  @IsOptional() @IsObject() data?: Record<string, unknown>;
}

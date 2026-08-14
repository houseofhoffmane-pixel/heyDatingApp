import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListNotificationsDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 30;
  @IsOptional() @Type(() => Boolean) @IsBoolean()
  unreadOnly?: boolean;
}

export class MarkNotificationsReadDto {
  @IsOptional() @IsString() upToId?: string;
}

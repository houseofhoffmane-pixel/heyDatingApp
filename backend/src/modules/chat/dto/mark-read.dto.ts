import { IsOptional, IsUUID } from 'class-validator';

export class MarkReadDto {
  /** If omitted, mark every unread message in the match as read. */
  @IsOptional() @IsUUID('all') upToMessageId?: string;
}

export class WsMarkReadDto extends MarkReadDto {
  @IsUUID('all') matchId!: string;
}

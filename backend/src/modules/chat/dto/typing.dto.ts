import { IsUUID } from 'class-validator';

export class WsTypingDto {
  @IsUUID('all') matchId!: string;
}

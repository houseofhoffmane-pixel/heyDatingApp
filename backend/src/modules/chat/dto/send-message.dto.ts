import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

const KINDS = ['text', 'place_share', 'location_share'] as const;

export class SendMessageDto {
  /** Idempotency key from the client. Re-send with the same value is a no-op. */
  @IsString() @Length(1, 64) clientId!: string;

  @IsString() @Length(1, 4000) body!: string;

  @IsOptional() @IsIn(KINDS as readonly string[])
  kind: (typeof KINDS)[number] = 'text';
}

/** WS payload — same as REST plus the matchId in the envelope. */
export class WsSendMessageDto extends SendMessageDto {
  @IsUUID('all') matchId!: string;
}

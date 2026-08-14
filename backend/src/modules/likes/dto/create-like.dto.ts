import { IsIn, IsOptional, IsString, IsUUID, Length, ValidateIf } from 'class-validator';

const ANCHOR_TYPES = ['photo', 'prompt'] as const;

export class CreateLikeDto {
  @IsUUID('all') toUserId!: string;

  @IsIn(ANCHOR_TYPES as readonly string[])
  anchorType!: (typeof ANCHOR_TYPES)[number];

  @ValidateIf((o) => o.anchorType === 'photo')
  @IsUUID('all') anchorPhotoId?: string;

  @ValidateIf((o) => o.anchorType === 'prompt')
  @IsUUID('all') anchorPromptId?: string;

  /** Optional compliment ≤ 140 chars (spec §3.13). */
  @IsOptional() @IsString() @Length(1, 140) comment?: string;
}

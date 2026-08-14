import { IsIn, IsString, IsUUID, Length } from 'class-validator';

const TARGETS = ['profile', 'spot', 'event'] as const;
const REASONS = [
  'fake', 'inappropriate', 'harassment', 'spam', 'underage', 'scam',
  'closed', 'wrong_info', 'unsafe', 'duplicate', 'misleading', 'cancelled', 'other',
] as const;

export class CreateReportDto {
  @IsIn(TARGETS as readonly string[]) targetType!: (typeof TARGETS)[number];
  @IsUUID('all') targetId!: string;
  @IsIn(REASONS as readonly string[]) reason!: (typeof REASONS)[number];
  /** Spec §3.16: detail ≥ 10 chars enforced server-side too (the DB CHECK is the belt-and-braces). */
  @IsString() @Length(10, 280) detail!: string;
}

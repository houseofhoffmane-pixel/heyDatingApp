import { IsDateString, IsIn, IsOptional } from 'class-validator';

const STATUSES = ['active', 'paused', 'hidden'] as const;

export class AccountStatusDto {
  @IsIn(STATUSES as readonly string[])
  status!: (typeof STATUSES)[number];

  /** ISO timestamp at which auto-resume should flip back to `active`. */
  @IsOptional() @IsDateString() autoResumeAt?: string;
}

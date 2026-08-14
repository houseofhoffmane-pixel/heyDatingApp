import { IsString, Matches } from 'class-validator';

export class OtpRequestDto {
  /** E.164: leading + and 8–15 digits. Server re-validates via libphonenumber. */
  @IsString()
  @Matches(/^\+\d{8,15}$/, { message: 'phone must be E.164 (e.g. +15550104242)' })
  phone_e164!: string;
}

import { IsString, Length, Matches } from 'class-validator';

export class OtpVerifyDto {
  @IsString()
  @Matches(/^\+\d{8,15}$/, { message: 'phone must be E.164' })
  phone_e164!: string;

  /** 4–10 digits; Twilio Verify defaults to 6. */
  @IsString()
  @Length(4, 10)
  @Matches(/^\d+$/, { message: 'code must be digits' })
  code!: string;
}

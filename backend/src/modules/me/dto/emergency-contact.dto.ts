import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class PutEmergencyContactDto {
  @IsString() @Length(1, 80) name!: string;
  @IsString() @Matches(/^\+\d{8,15}$/, { message: 'phone must be E.164' })
  phoneE164!: string;
  @IsOptional() @IsBoolean() autoShareFirstDate?: boolean;
  @IsOptional() @IsBoolean() checkinTimer?: boolean;
}

import { IsUUID } from 'class-validator';

export class CreatePassDto {
  @IsUUID('all') toUserId!: string;
}

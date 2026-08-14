import { IsUUID } from 'class-validator';

export class CreateBlockDto {
  @IsUUID('all') userId!: string;
}

import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, IsUUID, Length, ValidateNested } from 'class-validator';

export class PromptAnswerDto {
  @IsUUID('all') prompt_id!: string;
  @IsString() @Length(1, 140) answer!: string;
}

export class SetPromptsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PromptAnswerDto)
  items!: PromptAnswerDto[];
}

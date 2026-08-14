import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class SetInterestsDto {
  /** 3–6 interest IDs from the catalog. */
  @IsArray() @ArrayMinSize(3) @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  interest_ids!: string[];
}

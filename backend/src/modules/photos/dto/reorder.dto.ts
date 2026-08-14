import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class ReorderPhotosDto {
  /** Final order — index 0 becomes main. 2–6 ids. */
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(6)
  @IsUUID('all', { each: true })
  orderedIds!: string[];
}

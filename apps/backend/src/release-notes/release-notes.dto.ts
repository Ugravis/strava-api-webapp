import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
} from 'class-validator';
import { RELEASE_VERSION_PATTERN } from '@kilotrace/shared';

export class MarkReleaseNotesSeenDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(RELEASE_VERSION_PATTERN, { each: true })
  versions!: string[];
}

import {
  RELEASE_NOTE_DISPLAYS,
  RELEASE_NOTE_SECTION_MAX_LENGTH,
  RELEASE_NOTE_SUMMARY_MAX_LENGTH,
  RELEASE_NOTE_TITLE_MAX_LENGTH,
  RELEASE_VERSION_PATTERN,
  type ReleaseNoteDisplay,
} from '@kilotrace/shared';
import {
  RELEASE_NOTE_STATUSES,
  type ReleaseNoteStatus,
} from '@kilotrace/shared/admin';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TrimToNull } from '../../common/transformers';

const nullable = ValidateIf(
  (_, value) => value !== null && value !== undefined,
);

/** The fields sent are changed; an empty text is cleared. */
export class UpdateReleaseNoteDto {
  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_TITLE_MAX_LENGTH)
  title?: string | null;

  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_SUMMARY_MAX_LENGTH)
  summary?: string | null;

  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_SECTION_MAX_LENGTH)
  new?: string | null;

  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_SECTION_MAX_LENGTH)
  improved?: string | null;

  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_SECTION_MAX_LENGTH)
  fixed?: string | null;

  @TrimToNull()
  @nullable
  @IsString()
  @MaxLength(RELEASE_NOTE_SECTION_MAX_LENGTH)
  other?: string | null;

  @IsOptional()
  @IsIn(RELEASE_NOTE_DISPLAYS)
  display?: ReleaseNoteDisplay;
}

export class CreateReleaseNoteDto extends UpdateReleaseNoteDto {
  @IsString()
  @Matches(RELEASE_VERSION_PATTERN)
  version!: string;
}

export class SetReleaseNoteStatusDto {
  @IsIn(RELEASE_NOTE_STATUSES)
  status!: ReleaseNoteStatus;
}

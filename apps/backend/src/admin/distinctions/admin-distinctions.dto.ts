import {
  ADMIN_BADGE_SLUG,
  ADMIN_DISTINCTION_DESCRIPTION_MAX_LENGTH,
  ADMIN_DISTINCTION_ID_MAX_LENGTH,
  ADMIN_DISTINCTION_NAME_MAX_LENGTH,
} from '@kilotrace/shared/admin';
import {
  IsHexColor,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transformers';

/** Every field of a distinction but its id. */
export class UpdateDistinctionDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_DISTINCTION_NAME_MAX_LENGTH)
  name!: string;

  @ValidateIf((_, value) => value !== null)
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_DISTINCTION_DESCRIPTION_MAX_LENGTH)
  description!: string | null;

  /** Resolved by the clients, which fall back on a generic icon. */
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(40)
  icon!: string;

  @ValidateIf((_, value) => value !== null)
  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color!: string | null;
}

export class CreateDistinctionDto extends UpdateDistinctionDto {
  @IsString()
  @Matches(ADMIN_BADGE_SLUG)
  @MaxLength(ADMIN_DISTINCTION_ID_MAX_LENGTH)
  id!: string;
}

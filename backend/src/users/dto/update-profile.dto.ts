import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TrimToNull } from '../../common/transformers';
import { FAVORITE_SPORTS, type FavoriteSport } from '../favorite-sports';
import { OptionalDisplayNameField, UsernameField } from './user-fields';
import {
  BIO_MAX_LENGTH,
  CITY_MAX_LENGTH,
  PROFILE_COLOR_PATTERN,
} from './validation.constants';

export class UpdateProfileDto {
  @OptionalDisplayNameField()
  displayName?: string | null;

  @IsOptional()
  @UsernameField()
  username?: string;

  /** Null (or an empty string) clears it. */
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(BIO_MAX_LENGTH)
  bio?: string | null;

  /** Null (or an empty string) clears it. */
  @TrimToNull()
  @IsOptional()
  @IsString()
  @MaxLength(CITY_MAX_LENGTH)
  city?: string | null;

  /** Country of the city, picked along with it; cleared with it. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  @IsOptional()
  @IsISO31661Alpha2()
  countryCode?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(FAVORITE_SPORTS, { each: true })
  favoriteSports?: FavoriteSport[];

  /** `#rrggbb`; null (or an empty string) restores the default one. */
  @TrimToNull()
  @IsOptional()
  @Matches(PROFILE_COLOR_PATTERN)
  profileColor?: string | null;
}

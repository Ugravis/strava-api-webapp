import {
  ADMIN_BADGE_DESCRIPTION_MAX_LENGTH,
  ADMIN_BADGE_FAMILIES,
  ADMIN_BADGE_ID_MAX_LENGTH,
  ADMIN_BADGE_METRICS,
  ADMIN_BADGE_NAME_MAX_LENGTH,
  ADMIN_BADGE_SLUG,
  ADMIN_BADGE_THEME_ID_MAX_LENGTH,
  ADMIN_BADGE_THEME_NAME_MAX_LENGTH,
  ADMIN_BADGE_TIERS_MAX,
  type AdminBadgeFamily,
  type AdminBadgeMetric,
} from '@kilotrace/shared/admin';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsHexColor,
  IsIn,
  IsNumber,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Trim } from '../../common/transformers';

/** Every field of a badge but its id. */
export class UpdateBadgeDto {
  @IsIn(ADMIN_BADGE_METRICS)
  metric!: AdminBadgeMetric;

  @IsIn(ADMIN_BADGE_FAMILIES)
  family!: AdminBadgeFamily;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  target!: number;

  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ADMIN_BADGE_TIERS_MAX)
  @ArrayUnique()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  @IsPositive({ each: true })
  tiers!: number[] | null;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_BADGE_NAME_MAX_LENGTH)
  name!: string;

  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_BADGE_DESCRIPTION_MAX_LENGTH)
  description!: string;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(ADMIN_BADGE_THEME_ID_MAX_LENGTH)
  themeId!: string | null;

  /** Resolved by the clients, which fall back on a generic icon. */
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(40)
  icon!: string;

  @ValidateIf((_, value) => value !== null)
  @IsHexColor()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  backgroundColor!: string | null;
}

export class CreateBadgeDto extends UpdateBadgeDto {
  @IsString()
  @Matches(ADMIN_BADGE_SLUG)
  @MaxLength(ADMIN_BADGE_ID_MAX_LENGTH)
  id!: string;
}

export class SetBadgeActiveDto {
  @IsBoolean()
  active!: boolean;
}

export class UpdateBadgeThemeDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ADMIN_BADGE_THEME_NAME_MAX_LENGTH)
  name!: string;
}

export class CreateBadgeThemeDto extends UpdateBadgeThemeDto {
  @IsString()
  @Matches(ADMIN_BADGE_SLUG)
  @MaxLength(ADMIN_BADGE_THEME_ID_MAX_LENGTH)
  id!: string;
}

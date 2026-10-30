import {
  ADMIN_BADGE_SLUG,
  ADMIN_USER_TAG_ID_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  MODERATABLE_FIELDS,
  type ModeratableField,
} from '@kilotrace/shared/admin';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** The reason itself is checked by the audit interceptor. */
export class ReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(ADMIN_REASON_MAX_LENGTH)
  reason?: string;
}

export class SuspendUserDto extends ReasonDto {
  @IsOptional()
  @IsDateString({ strict: true })
  until?: string;
}

export class ModerateUserDto extends ReasonDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsIn(MODERATABLE_FIELDS, { each: true })
  fields!: ModeratableField[];
}

export class UserTagParamsDto {
  @IsString()
  @Matches(ADMIN_BADGE_SLUG)
  @MaxLength(ADMIN_USER_TAG_ID_MAX_LENGTH)
  kind!: string;
}

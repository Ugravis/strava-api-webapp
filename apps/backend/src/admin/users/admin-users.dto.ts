import {
  ADMIN_BADGE_SLUG,
  ADMIN_DISTINCTION_ID_MAX_LENGTH,
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_USER_SORTS,
  ADMIN_USER_STATUSES,
  type AdminUserSort,
  type AdminUserStatus,
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
import { Trim } from '../../common/transformers';
import { AdminPageQueryDto } from '../common/admin-page-query.dto';

export class AdminUsersQueryDto extends AdminPageQueryDto {
  /** Part of the username, display name or email, or a whole id. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsIn(ADMIN_USER_STATUSES)
  status: AdminUserStatus = 'all';

  @IsOptional()
  @IsIn(ADMIN_USER_SORTS)
  sort: AdminUserSort = 'created-desc';
}

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

export class DistinctionParamsDto {
  @IsString()
  @Matches(ADMIN_BADGE_SLUG)
  @MaxLength(ADMIN_DISTINCTION_ID_MAX_LENGTH)
  kind!: string;
}

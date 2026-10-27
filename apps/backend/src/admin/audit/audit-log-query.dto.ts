import {
  AUDIT_OUTCOMES,
  AUDIT_VISIBILITIES,
  type AuditOutcome,
  type AuditVisibility,
} from '@kilotrace/shared/admin';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { AdminPageQueryDto } from '../common/admin-page-query.dto';

export class AuditLogQueryDto extends AdminPageQueryDto {
  /** An action, or the start of one ending with a dot, e.g. `users.`. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z][a-z0-9.-]{0,99}$/)
  action?: string;

  @IsOptional()
  @IsUUID()
  actor?: string;

  /** Id of the entity acted upon, of any type. */
  @IsOptional()
  @IsString()
  @Matches(/^[\w-]{1,100}$/)
  target?: string;

  @IsOptional()
  @IsIn(AUDIT_OUTCOMES)
  outcome: AuditOutcome = 'all';

  /** Honoured for the super-admins only; the others never see a masked entry. */
  @IsOptional()
  @IsIn(AUDIT_VISIBILITIES)
  visibility: AuditVisibility = 'all';
}

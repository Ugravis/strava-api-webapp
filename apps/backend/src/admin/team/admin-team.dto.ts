import { ADMIN_ROLES, type AdminRole } from '@kilotrace/shared/admin';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transformers';

export class TeamCandidatesQueryDto {
  /** Part of the username, display name or email. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;
}

export class SetTeamRoleDto {
  @IsIn(ADMIN_ROLES)
  role!: AdminRole;
}

import {
  type AdminTeamCandidate,
  type AdminTeamMember,
} from '@kilotrace/shared/admin';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { SetTeamRoleDto, TeamCandidatesQueryDto } from './admin-team.dto';
import { AdminTeamService } from './admin-team.service';

const TARGET = { type: 'user', param: 'id' };

/**
 * Members of the team and their roles: support reads, super-admins act,
 * never on themselves.
 */
@AdminController('team')
export class AdminTeamController {
  constructor(private readonly team: AdminTeamService) {}

  @Get()
  @Permission('team.view')
  members(): Promise<AdminTeamMember[]> {
    return this.team.members();
  }

  @Get('candidates')
  @Permission('team.manage')
  candidates(
    @Query() query: TeamCandidatesQueryDto,
  ): Promise<AdminTeamCandidate[]> {
    return this.team.candidates(query.q);
  }

  @Put(':id')
  @Permission('team.manage')
  @Audited({ action: 'roles.grant', target: TARGET, details: ['role'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setRole(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTeamRoleDto,
  ): Promise<void> {
    return this.team.setRole(actor, id, dto.role);
  }

  @Delete(':id')
  @Permission('team.manage')
  @Audited({ action: 'roles.revoke', target: TARGET })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.team.remove(actor, id);
  }
}

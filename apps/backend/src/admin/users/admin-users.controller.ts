import {
  type AdminPage,
  type AdminUserDetail,
  type AdminUserSummary,
} from '@kilotrace/shared/admin';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import {
  AdminUsersQueryDto,
  DistinctionParamsDto,
  ModerateUserDto,
  ReasonDto,
  SuspendUserDto,
} from './admin-users.dto';
import { AdminUsersService } from './admin-users.service';

const TARGET = { type: 'user', param: 'id' };

/**
 * Accounts as seen by the team: support reads, admins act. An action never
 * targets the actor nor a member of the team of the same rank or above.
 */
@AdminController('users')
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @AnyMember()
  page(
    @Query() query: AdminUsersQueryDto,
  ): Promise<AdminPage<AdminUserSummary>> {
    return this.users.page(query);
  }

  @Get(':id')
  @AnyMember()
  detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminUserDetail> {
    return this.users.detail(id);
  }

  @Put(':id/suspension')
  @Permission('users.suspend')
  @Audited({
    action: 'users.suspend',
    target: TARGET,
    destructive: true,
    details: ['until'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  suspend(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
  ): Promise<void> {
    return this.users.suspend(actor, id, dto);
  }

  @Delete(':id/suspension')
  @Permission('users.suspend')
  @Audited({ action: 'users.unsuspend', target: TARGET })
  @HttpCode(HttpStatus.NO_CONTENT)
  lift(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.users.lift(actor, id);
  }

  @Delete(':id')
  @Permission('users.delete')
  @Audited({ action: 'users.delete', target: TARGET, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.users.delete(actor, id);
  }

  @Delete(':id/strava')
  @Permission('users.strava')
  @Audited({ action: 'users.strava.unlink', target: TARGET, destructive: true })
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkStrava(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReasonDto,
  ): Promise<void> {
    return this.users.unlinkStrava(actor, id, dto.reason!.trim());
  }

  @Delete(':id/sessions')
  @Permission('users.sessions')
  @Audited({ action: 'users.sessions.revoke', target: TARGET })
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeSessions(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.users.revokeSessions(actor, id);
  }

  @Post(':id/moderation')
  @Permission('users.moderate')
  @Audited({
    action: 'users.moderate',
    target: TARGET,
    destructive: true,
    details: ['fields'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  moderate(
    @CurrentUser() actor: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateUserDto,
  ): Promise<void> {
    return this.users.moderate(actor, id, dto);
  }

  @Put(':id/distinctions/:kind')
  @Permission('users.distinctions')
  @Audited({
    action: 'users.distinctions.grant',
    target: TARGET,
    details: ['kind'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  grantDistinction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param() { kind }: DistinctionParamsDto,
  ): Promise<void> {
    return this.users.grantDistinction(id, kind);
  }

  @Delete(':id/distinctions/:kind')
  @Permission('users.distinctions')
  @Audited({
    action: 'users.distinctions.revoke',
    target: TARGET,
    details: ['kind'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeDistinction(
    @Param('id', ParseUUIDPipe) id: string,
    @Param() { kind }: DistinctionParamsDto,
  ): Promise<void> {
    return this.users.revokeDistinction(id, kind);
  }
}

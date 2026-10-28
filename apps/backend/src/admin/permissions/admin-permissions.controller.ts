import type { AdminPermissionsResponse } from '@kilotrace/shared/admin';
import { Body, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { SetRolePermissionsDto } from './admin-permissions.dto';
import { AdminPermissionsService } from './admin-permissions.service';

/** Permissions of the roles below super-admin: the team reads, super-admins set them. */
@AdminController('permissions')
export class AdminPermissionsController {
  constructor(private readonly permissions: AdminPermissionsService) {}

  @Get()
  @Permission('team.view')
  async grants(): Promise<AdminPermissionsResponse> {
    return { grants: await this.permissions.grants() };
  }

  @Put()
  @Permission('permissions.manage')
  @Audited({ action: 'roles.permissions', details: ['grants'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  setGrants(@Body() dto: SetRolePermissionsDto): Promise<void> {
    return this.permissions.setGrants(dto.grants);
  }
}

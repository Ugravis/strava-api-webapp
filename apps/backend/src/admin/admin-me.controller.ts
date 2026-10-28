import { type AdminMeResponse, isAdminRole } from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { AdminController } from './access/admin-controller.decorator';
import { AnyMember } from './access/permission.decorator';
import { AdminPermissionsService } from './permissions/admin-permissions.service';

@AdminController('me')
export class AdminMeController {
  constructor(private readonly permissions: AdminPermissionsService) {}

  /** The caller, their back-office roles and permissions, to filter the navigation and the actions. */
  @Get()
  @AnyMember()
  async me(@CurrentUser() user: User): Promise<AdminMeResponse> {
    return {
      id: user.id,
      roles: user.roles.filter(isAdminRole),
      permissions: await this.permissions.permissionsOf(user.roles),
    };
  }
}

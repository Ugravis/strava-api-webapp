import {
  AdminRole,
  type AdminMeResponse,
  isAdminRole,
} from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { AdminController } from './access/admin-controller.decorator';
import { Roles } from './access/roles.decorator';

@AdminController('me')
export class AdminMeController {
  /** The caller and their back-office roles, to filter the navigation and the actions. */
  @Get()
  @Roles(AdminRole.Support)
  me(@CurrentUser() user: User): AdminMeResponse {
    return { id: user.id, roles: user.roles.filter(isAdminRole) };
  }
}

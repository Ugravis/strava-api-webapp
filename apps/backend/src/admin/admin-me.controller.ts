import { type AdminMe, AdminRole } from '@kilotrace/shared';
import { Get } from '@nestjs/common';
import { AdminController } from './decorators/admin-controller.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { Roles } from './decorators/roles.decorator';
import type { AdminUser } from './users/admin-user.entity';

@AdminController('me')
@Roles(AdminRole.Support)
export class AdminMeController {
  @Get()
  me(@CurrentAdmin() admin: AdminUser): AdminMe {
    return { id: admin.id, email: admin.email, role: admin.role };
  }
}

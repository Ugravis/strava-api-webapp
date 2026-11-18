import { ADMIN_ROLES, type AdminPermission } from '@kilotrace/shared/admin';
import type { Repository } from 'typeorm';
import type { AdminPermissionsService } from '../admin/permissions/admin-permissions.service';
import type { User } from '../users/user.entity';

/** The members of the team holding the permission to process a kind of reports, but those in `except`. */
export async function reportHandlers(
  users: Repository<User>,
  permissions: AdminPermissionsService,
  permission: AdminPermission,
  except: string[],
): Promise<User[]> {
  const members = await users
    .createQueryBuilder('user')
    .where('user.roles && :roles', { roles: [...ADMIN_ROLES] })
    .getMany();
  const handlers: User[] = [];
  for (const member of members) {
    if (
      !except.includes(member.id) &&
      (await permissions.can(member.roles, permission))
    ) {
      handlers.push(member);
    }
  }
  return handlers;
}

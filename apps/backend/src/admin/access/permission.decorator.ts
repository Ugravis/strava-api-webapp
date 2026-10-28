import type { AdminPermission } from '@kilotrace/shared/admin';
import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'adminPermission';

/** Open to every member of the team, whatever their permissions. */
export const ANY_MEMBER = 'any';

/**
 * Permission required on a back-office route, set per role from the
 * Permissions page. A route without it is refused to everyone.
 */
export const Permission = (
  permission: AdminPermission,
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSION_KEY, permission);

/** For the routes every member needs, e.g. their own permissions. */
export const AnyMember = (): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_KEY, ANY_MEMBER);

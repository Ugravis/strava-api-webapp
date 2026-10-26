import type { AdminRole } from '@kilotrace/shared';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'adminRole';

/**
 * Lowest role allowed on a back-office route; higher roles inherit it. A
 * route without it is refused to everyone.
 */
export const Roles = (role: AdminRole): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, role);

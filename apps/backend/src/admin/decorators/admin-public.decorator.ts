import { SetMetadata } from '@nestjs/common';

export const ADMIN_PUBLIC_KEY = 'adminPublic';

/**
 * Opens a back-office route without a session: the sign-in steps only. The
 * guard accepts it on read-only methods, never on a state-changing one.
 */
export const AdminPublic = (): MethodDecorator =>
  SetMetadata(ADMIN_PUBLIC_KEY, true);

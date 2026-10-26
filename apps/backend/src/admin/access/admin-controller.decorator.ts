import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthContext } from '../../auth/auth-request';

export const ADMIN_AREA_KEY = 'adminArea';

/**
 * Per admin and route, instead of the default limit of the public API: the
 * calls all come from the Next.js server, so the client IP tells nothing.
 * The access middleware has set the user by the time the limit applies.
 */
export const ADMIN_THROTTLE = {
  limit: 60,
  ttl: 60_000,
  getTracker: (request: Record<string, unknown>) =>
    (request.auth as AuthContext | undefined)?.user.id ?? '',
} as const;

/**
 * Mounts a controller under `/admin`, behind the roles guard, with the rate
 * limit of the back office.
 */
export const AdminController = (path: string): ClassDecorator =>
  applyDecorators(
    Controller(`admin/${path}`),
    SetMetadata(ADMIN_AREA_KEY, true),
    Throttle({ default: ADMIN_THROTTLE }),
  );

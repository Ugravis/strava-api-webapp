import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthContext } from '../../auth/auth-request';
import { Public } from '../../auth/decorators/public.decorator';
import { SensitiveThrottle } from '../../auth/throttle';

export const ADMIN_AREA_KEY = 'adminArea';
export const ADMIN_SIGN_IN_KEY = 'adminSignIn';

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

/**
 * Mounts the sign-in of the back office under `/admin/auth`: behind the
 * secret of the admin app (access middleware) but before any session, so
 * left alone by the session and roles guards. Limited per client IP, which
 * the admin app forwards.
 */
export const AdminSignInController = (): ClassDecorator =>
  applyDecorators(
    Controller('admin/auth'),
    Public(),
    SetMetadata(ADMIN_SIGN_IN_KEY, true),
    SensitiveThrottle(),
  );

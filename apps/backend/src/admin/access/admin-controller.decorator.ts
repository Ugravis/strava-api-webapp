import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export const ADMIN_AREA_KEY = 'adminArea';

/** Per client IP and route, instead of the default limit of the public API. */
export const ADMIN_THROTTLE = { limit: 60, ttl: 60_000 } as const;

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

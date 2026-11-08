import { Throttle } from '@nestjs/throttler';

/** Global limit applied to every route, per client IP. */
export const DEFAULT_THROTTLE = {
  name: 'default',
  ttl: 60_000,
  limit: 120,
} as const;

/** Stricter limit for credential-related endpoints, per client IP. */
export const SensitiveThrottle = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { limit: 10, ttl: 60_000 } });

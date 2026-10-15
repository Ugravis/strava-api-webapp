import { Throttle } from '@nestjs/throttler';

/** Stricter limit for credential-related endpoints, per client IP. */
export const SensitiveThrottle = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { limit: 10, ttl: 60_000 } });

import { ADMIN_GATEWAY_HEADER } from '@kilotrace/shared/admin';
import type { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value: string): Buffer =>
  createHash('sha256').update(value).digest();

/**
 * Whether the request carries the secret of the admin app, compared in
 * constant time. No secret configured: nothing passes, the back office
 * stays closed.
 */
export function hasGatewaySecret(
  request: Request,
  secret: string | null,
): boolean {
  const sent = request.get(ADMIN_GATEWAY_HEADER);
  if (!secret || !sent) {
    return false;
  }
  // Digests of equal length, so that the length of the secret leaks neither.
  return timingSafeEqual(digest(sent), digest(secret));
}

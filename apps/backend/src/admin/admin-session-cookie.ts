import type { Request } from 'express';

/**
 * Host-only cookie of the back office: never shared with the public frontend,
 * whose session cookie is distinct.
 */
export const ADMIN_SESSION_COOKIE = 'kilotrace_admin_session';

export function readAdminSessionCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string | undefined>;
  return cookies[ADMIN_SESSION_COOKIE] ?? null;
}

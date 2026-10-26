import { ADMIN_SESSION_COOKIE } from '@kilotrace/shared';
import type { Request } from 'express';

export function readAdminSessionCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string | undefined>;
  return cookies[ADMIN_SESSION_COOKIE] ?? null;
}

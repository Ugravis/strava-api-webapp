import { ADMIN_SESSION_COOKIE } from '@kilotrace/shared';
import type { CookieOptions, Request, Response } from 'express';

export function readAdminSessionCookie(request: Request): string | null {
  const cookies = request.cookies as Record<string, string | undefined>;
  return cookies[ADMIN_SESSION_COOKIE] ?? null;
}

/**
 * Host-only (no `Domain`) and without expiry: it ends with the browser, and
 * the session itself after its idle time or maximum age.
 */
export function writeAdminSessionCookie(
  response: Response,
  token: string,
  secure: boolean,
): void {
  response.cookie(ADMIN_SESSION_COOKIE, token, options(secure));
}

export function clearAdminSessionCookie(
  response: Response,
  secure: boolean,
): void {
  response.clearCookie(ADMIN_SESSION_COOKIE, options(secure));
}

function options(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}

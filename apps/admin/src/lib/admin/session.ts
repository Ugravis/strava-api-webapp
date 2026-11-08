import "server-only";
import { ADMIN_GATEWAY_HEADER, ADMIN_SESSION_COOKIE, type AdminSessionResponse } from "@kilotrace/shared/admin";
import { cookies, headers } from "next/headers";
import { PERSISTENT_PREFIX, SESSION_COOKIE_OPTIONS, tokenOf } from "./session-cookie";

export const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** Shared with the backend only: the public site never holds it. */
const GATEWAY_SECRET = process.env.ADMIN_GATEWAY_SECRET ?? "";

/**
 * Headers of every call to `/api/admin`: the secret of the admin app, the
 * session of the back office alone (no other cookie of the browser), and
 * the client IP and user agent, for the rate limit and the sessions.
 */
export async function backendHeaders(): Promise<Record<string, string>> {
  const [incoming, cookieStore] = await Promise.all([headers(), cookies()]);
  const token = tokenOf(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const forwardedFor = incoming.get("x-forwarded-for");
  const userAgent = incoming.get("user-agent");
  return {
    [ADMIN_GATEWAY_HEADER]: GATEWAY_SECRET,
    ...(token && { Cookie: `${ADMIN_SESSION_COOKIE}=${token}` }),
    ...(forwardedFor && { "X-Forwarded-For": forwardedFor }),
    ...(userAgent && { "User-Agent": userAgent }),
  };
}

/** Sets the cookie of a session just opened, in a Server Action or a route handler. */
export async function openSession(session: AdminSessionResponse): Promise<void> {
  const value = session.persistent ? `${PERSISTENT_PREFIX}${session.token}` : session.token;
  (await cookies()).set(ADMIN_SESSION_COOKIE, value, {
    ...SESSION_COOKIE_OPTIONS,
    ...(session.persistent && { expires: new Date(session.expiresAt) }),
  });
}

export async function closeSession(): Promise<void> {
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
}

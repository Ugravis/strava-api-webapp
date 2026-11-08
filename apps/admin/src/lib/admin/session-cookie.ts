/*
 * The cookie of the back-office session, on the host of the admin app only.
 * Read by the proxy too, so free of server-only imports.
 */

/** Marks a "stay signed in" session, whose cookie the proxy keeps alive. */
export const PERSISTENT_PREFIX = "p.";

/** As the session of the site: 30 days, extended while it is used (backend `sessionTtlDays`). */
export const PERSISTENT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Secure once served over https, as the backend does for the site. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: (process.env.ADMIN_URL ?? "").startsWith("https://"),
  sameSite: "lax",
  path: "/",
} as const;

/** The token sent to the backend, without the mark of a persistent session. */
export function tokenOf(value: string | undefined): string | undefined {
  return value?.startsWith(PERSISTENT_PREFIX) ? value.slice(PERSISTENT_PREFIX.length) : value || undefined;
}

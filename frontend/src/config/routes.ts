export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  googleSignup: "/register/google",
  forgotPassword: "/forgot-password",
  profile: "/profile",
  settings: "/settings",
  sessionExpired: "/session-expired",
} as const;

/** Routes requiring a session, checked optimistically by the proxy. */
export const PROTECTED_PREFIXES = [routes.profile, routes.settings];

/** Landing route once signed in. */
export const DEFAULT_AUTHENTICATED_ROUTE = routes.profile;

export const SESSION_COOKIE = "session";

/** Accepts only same-origin relative paths, to prevent open redirects. */
export function safeRedirectPath(path: string | null | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//")
    ? path
    : DEFAULT_AUTHENTICATED_ROUTE;
}

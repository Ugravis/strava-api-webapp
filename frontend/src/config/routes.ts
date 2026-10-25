export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  googleSignup: "/register/google",
  forgotPassword: "/forgot-password",
  terms: "/terms",
  features: "/#features",
  howItWorks: "/#how-it-works",
  faq: "/#faq",
  dashboard: "/dashboard",
  achievements: "/achievements",
  map: "/map",
  /** The own profile, then those followed, in a deck; any other one through `?user=`. */
  profiles: "/profiles",
  settings: "/settings",
  /** The profile section of the settings. */
  settingsProfile: "/settings#profile",
  sessionExpired: "/session-expired",
} as const;

/** Routes requiring a session, checked optimistically by the proxy. */
export const PROTECTED_PREFIXES = [routes.dashboard, routes.achievements, routes.map, routes.profiles, routes.settings];

/** Query parameter of the profiles page naming the profile shown. */
export const PROFILE_PARAM = "user";

/** The public profile of a user, on the profiles page. */
export const userProfileHref = (username: string) => `${routes.profiles}?${PROFILE_PARAM}=${encodeURIComponent(username)}`;

/** Landing route once signed in. */
export const DEFAULT_AUTHENTICATED_ROUTE = routes.dashboard;

/** Same name as the backend cookie (backend/src/auth/session-cookie.ts). */
export const SESSION_COOKIE = "kilotrace_session";

/**
 * Accepts only same-origin relative paths, to prevent open redirects. Browsers
 * read a backslash as a slash, so `/\evil.com` would leave the site too.
 */
export function safeRedirectPath(path: string | null | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : DEFAULT_AUTHENTICATED_ROUTE;
}

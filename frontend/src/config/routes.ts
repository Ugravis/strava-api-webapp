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
  profile: "/profile",
  users: "/users",
  settings: "/settings",
  /** The profile section of the settings. */
  settingsProfile: "/settings#profile",
  sessionExpired: "/session-expired",
} as const;

/** Routes requiring a session, checked optimistically by the proxy. */
export const PROTECTED_PREFIXES = [routes.dashboard, routes.achievements, routes.map, routes.profile, routes.users, routes.settings];

/** The public profile of a user. */
export const userProfileHref = (username: string) => `${routes.users}/${encodeURIComponent(username)}`;

/** Landing route once signed in. */
export const DEFAULT_AUTHENTICATED_ROUTE = routes.dashboard;

export const SESSION_COOKIE = "session";

/** Accepts only same-origin relative paths, to prevent open redirects. */
export function safeRedirectPath(path: string | null | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//")
    ? path
    : DEFAULT_AUTHENTICATED_ROUTE;
}

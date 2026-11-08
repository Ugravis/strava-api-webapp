/**
 * Cookie of the back-office session, set by the admin app on its own host:
 * the session of the public site never opens the back office.
 */
export const ADMIN_SESSION_COOKIE = "kilotrace_admin_session";

/**
 * Header of the secret shared by the backend and the admin app only, sent
 * on every server-to-server call to `/api/admin`: without it, the back
 * office answers the 404 of an unknown route.
 */
export const ADMIN_GATEWAY_HEADER = "x-admin-gateway";

/** `GET /api/admin/auth/providers`: the sign-in methods of the back office. */
export interface AdminAuthProviders {
  google: boolean;
  /** Follows the email sign-in of the public site: off in production for now. */
  email: boolean;
}

/** `POST /api/admin/auth/google`: where to send the browser, and the signed state to keep until the callback. */
export interface AdminGoogleAuthorization {
  url: string;
  state: string;
}

/** `POST /api/admin/auth/google/callback`: the code and state returned by Google, with the state kept. */
export interface AdminGoogleCallbackRequest {
  code: string;
  state: string;
  signedState: string;
}

/** A back-office session opened: the token goes in the cookie of the admin app only. */
export interface AdminSessionResponse {
  token: string;
  expiresAt: string;
  /** False: a cookie ending with the browser, as "stay signed in" unchecked on the site. */
  persistent: boolean;
}

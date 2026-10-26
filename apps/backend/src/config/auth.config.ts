import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  frontendUrl: string;
  /** Public URL of the back office, on its own subdomain; unset when it is not deployed. */
  adminUrl: string | null;
  cookieSecret: string;
  /** Encrypts secrets stored in the database, such as third-party OAuth tokens. */
  encryptionSecret: string;
  secureCookies: boolean;
  /** Sign-up, sign-in and password reset by email; Google sign-in is unaffected. */
  emailSignInEnabled: boolean;
  /** Lifetime of a "stay signed in" session, extended while it is used. */
  sessionTtlDays: number;
  /** Idle lifetime of a session ending with the browser ("stay signed in" unchecked). */
  browserSessionTtlHours: number;
  passwordResetTtlMinutes: number;
}

export default registerAs('auth', (): AuthConfig => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  return {
    frontendUrl,
    adminUrl: process.env.ADMIN_URL || null,
    cookieSecret: process.env.COOKIE_SECRET ?? 'development-cookie-secret',
    encryptionSecret:
      process.env.ENCRYPTION_SECRET ?? 'development-encryption-secret',
    // Follows the public URL rather than NODE_ENV: an https site never sends cookies in clear.
    secureCookies: frontendUrl.startsWith('https://'),
    // Off by default in production until the email flows are finished.
    emailSignInEnabled: process.env.EMAIL_SIGN_IN_ENABLED
      ? process.env.EMAIL_SIGN_IN_ENABLED === 'true'
      : process.env.NODE_ENV !== 'production',
    sessionTtlDays: 30,
    browserSessionTtlHours: 24,
    passwordResetTtlMinutes: 60,
  };
});

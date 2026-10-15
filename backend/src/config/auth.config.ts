import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  frontendUrl: string;
  cookieSecret: string;
  /** Encrypts secrets stored in the database, such as third-party OAuth tokens. */
  encryptionSecret: string;
  secureCookies: boolean;
  /** Lifetime of a "stay signed in" session, extended while it is used. */
  sessionTtlDays: number;
  /** Idle lifetime of a session ending with the browser ("stay signed in" unchecked). */
  browserSessionTtlHours: number;
  passwordResetTtlMinutes: number;
}

export default registerAs('auth', (): AuthConfig => ({
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET ?? 'development-cookie-secret',
  encryptionSecret:
    process.env.ENCRYPTION_SECRET ?? 'development-encryption-secret',
  secureCookies: process.env.NODE_ENV === 'production',
  sessionTtlDays: 30,
  browserSessionTtlHours: 24,
  passwordResetTtlMinutes: 60,
}));

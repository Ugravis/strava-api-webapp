import { registerAs } from '@nestjs/config';

export interface GoogleConfig {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
  /** Callback of the sign-in of the back office, on its own host; same OAuth client. */
  adminRedirectUri: string;
}

export default registerAs('google', (): GoogleConfig => ({
  clientId: process.env.GOOGLE_CLIENT_ID || null,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/api/auth/google/callback`,
  adminRedirectUri:
    process.env.GOOGLE_ADMIN_REDIRECT_URI ??
    `${process.env.ADMIN_URL ?? 'http://localhost:3200'}/auth/google/callback`,
}));

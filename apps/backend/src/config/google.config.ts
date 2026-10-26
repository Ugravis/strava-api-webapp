import { registerAs } from '@nestjs/config';

export interface GoogleConfig {
  clientId: string | null;
  clientSecret: string | null;
  redirectUri: string;
}

export default registerAs('google', (): GoogleConfig => ({
  clientId: process.env.GOOGLE_CLIENT_ID || null,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/api/auth/google/callback`,
}));

import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  frontendUrl: string;
  cookieSecret: string;
  secureCookies: boolean;
  sessionTtlDays: number;
  emailVerificationTtlHours: number;
  passwordResetTtlMinutes: number;
}

export default registerAs('auth', (): AuthConfig => ({
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET ?? 'development-cookie-secret',
  secureCookies: process.env.NODE_ENV === 'production',
  sessionTtlDays: 30,
  emailVerificationTtlHours: 24,
  passwordResetTtlMinutes: 60,
}));

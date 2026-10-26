import { registerAs } from '@nestjs/config';
import type { GoogleConfig } from './google.config';

export interface AdminAuthConfig {
  /** Public URL of the back office, where the sign-in returns. */
  adminUrl: string;
  /** Dedicated OAuth client: the public sign-in client never opens the back office. */
  google: GoogleConfig;
  secureCookies: boolean;
}

export default registerAs('adminAuth', (): AdminAuthConfig => {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001';
  return {
    adminUrl,
    google: {
      clientId: process.env.ADMIN_GOOGLE_CLIENT_ID || null,
      clientSecret: process.env.ADMIN_GOOGLE_CLIENT_SECRET || null,
      redirectUri: `${adminUrl}/api/admin/auth/google/callback`,
    },
    secureCookies: adminUrl.startsWith('https://'),
  };
});

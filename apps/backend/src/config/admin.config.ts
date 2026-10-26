import { registerAs } from '@nestjs/config';

export interface AdminConfig {
  /**
   * Account made super-admin at startup while no user holds a back-office
   * role (`ADMIN_BOOTSTRAP_EMAIL`). Ignored once any role is granted.
   */
  bootstrapEmail: string | null;
}

export default registerAs('admin', (): AdminConfig => ({
  bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || null,
}));

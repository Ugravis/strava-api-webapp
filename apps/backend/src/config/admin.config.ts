import { registerAs } from '@nestjs/config';

export interface AdminConfig {
  /**
   * Account made super-admin at startup while no user holds a back-office
   * role (`ADMIN_BOOTSTRAP_EMAIL`). Ignored once any role is granted.
   */
  bootstrapEmail: string | null;
  /** `owner/name` of the GitHub repository whose commits the dev page lists. */
  githubRepository: string | null;
  /** Read-only token, required once the repository is private. */
  githubToken: string | null;
}

export default registerAs('admin', (): AdminConfig => ({
  bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || null,
  githubRepository: process.env.GITHUB_REPOSITORY?.trim() || null,
  githubToken: process.env.GITHUB_TOKEN?.trim() || null,
}));

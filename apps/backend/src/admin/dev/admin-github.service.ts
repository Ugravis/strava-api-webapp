import {
  ADMIN_COMMITS_COUNT,
  type AdminCommit,
  type AdminCommitsResponse,
} from '@kilotrace/shared/admin';
import { Inject, Injectable, Logger } from '@nestjs/common';
import adminConfig, { type AdminConfig } from '../../config/admin.config';
import {
  type GithubCommit,
  toAdminCommit,
  undeployedCount,
} from './github-commits';

const TIMEOUT_MS = 5000;
/** Keeps far below the 60 requests per hour GitHub allows without a token. */
const CACHE_MS = 5 * 60 * 1000;
/** A failure is retried sooner, without asking GitHub on every page view. */
const FAILURE_CACHE_MS = 60 * 1000;

/** Latest commits of `main`, read from the GitHub API and kept a few minutes. */
@Injectable()
export class AdminGithubService {
  private readonly logger = new Logger(AdminGithubService.name);
  private cache: { commits: AdminCommit[] | null; expiresAt: number } | null =
    null;

  constructor(@Inject(adminConfig.KEY) private readonly config: AdminConfig) {}

  async commits(): Promise<AdminCommitsResponse> {
    const repository = this.config.githubRepository;
    if (!repository) {
      return { status: 'unconfigured' };
    }
    const commits = await this.cached(repository);
    if (!commits) {
      return { status: 'unavailable', repository };
    }
    const deployed = process.env.GIT_COMMIT || null;
    return {
      status: 'ok',
      repository,
      commits,
      undeployed: undeployedCount(commits, deployed),
      deployed,
    };
  }

  private async cached(repository: string): Promise<AdminCommit[] | null> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.commits;
    }
    const commits = await this.fetch(repository);
    this.cache = {
      commits,
      expiresAt: Date.now() + (commits ? CACHE_MS : FAILURE_CACHE_MS),
    };
    return commits;
  }

  private async fetch(repository: string): Promise<AdminCommit[] | null> {
    const url = `https://api.github.com/repos/${repository}/commits?sha=main&per_page=${ADMIN_COMMITS_COUNT}`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(this.config.githubToken && {
            Authorization: `Bearer ${this.config.githubToken}`,
          }),
        },
      });
      if (!response.ok) {
        // A private repository answers 404 without a valid token.
        this.logger.warn(`GitHub commits of ${repository}: ${response.status}`);
        return null;
      }
      const commits = (await response.json()) as GithubCommit[];
      return commits.map(toAdminCommit);
    } catch (error) {
      this.logger.warn(`GitHub commits of ${repository}: ${String(error)}`);
      return null;
    }
  }
}

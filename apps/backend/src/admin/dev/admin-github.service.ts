import {
  ADMIN_COMMITS_PER_PAGE,
  type AdminCommitsResponse,
} from '@kilotrace/shared/admin';
import { Inject, Injectable, Logger } from '@nestjs/common';
import adminConfig, { type AdminConfig } from '../../config/admin.config';
import {
  firstParentLine,
  type GithubCommit,
  lastPage,
  toAdminCommit,
} from './github-commits';

const API = 'https://api.github.com';
const TIMEOUT_MS = 5000;
/** Keeps far below the rate limit of GitHub, even without a token. */
const CACHE_MS = 5 * 60 * 1000;
/** A failure is retried sooner, without asking GitHub on every page view. */
const FAILURE_CACHE_MS = 60 * 1000;

interface CommitsPage {
  commits: GithubCommit[];
  pages: number;
}

interface Cached<T> {
  value: T | null;
  expiresAt: number;
}

/** Commits of `main`, read from the GitHub API and kept a few minutes. */
@Injectable()
export class AdminGithubService {
  private readonly logger = new Logger(AdminGithubService.name);
  private readonly cache = new Map<string, Cached<unknown>>();

  constructor(@Inject(adminConfig.KEY) private readonly config: AdminConfig) {}

  async commits(page: number): Promise<AdminCommitsResponse> {
    const repository = this.config.githubRepository;
    if (!repository) {
      return { status: 'unconfigured' };
    }
    const first = await this.page(repository, 1);
    if (!first) {
      return { status: 'unavailable', repository };
    }
    // Past the last page, nothing to list nor to ask GitHub.
    const pages = first.pages;
    const current = Math.min(page, pages);
    // Every page before this one is needed to follow the line of `main`.
    const loaded = [first];
    for (let index = 2; index <= current; index += 1) {
      const next = await this.page(repository, index);
      if (!next) {
        return { status: 'unavailable', repository };
      }
      loaded.push(next);
    }
    const mainLine = firstParentLine(loaded.flatMap((each) => each.commits));
    const deployed = process.env.GIT_COMMIT || null;
    return {
      status: 'ok',
      repository,
      commits:
        page > pages
          ? []
          : loaded[current - 1].commits.map((commit) =>
              toAdminCommit(commit, mainLine),
            ),
      page,
      pages,
      deployed,
      undeployed: deployed ? await this.aheadBy(repository, deployed) : null,
    };
  }

  private page(repository: string, page: number): Promise<CommitsPage | null> {
    return this.cached(`page:${page}`, async () => {
      const response = await this.request(
        `/repos/${repository}/commits?sha=main&per_page=${ADMIN_COMMITS_PER_PAGE}&page=${page}`,
      );
      if (!response) {
        return null;
      }
      return {
        commits: (await response.json()) as GithubCommit[],
        pages: lastPage(response.headers.get('link'), page),
      };
    });
  }

  /** Commits of `main` missing from the deployed one. */
  private aheadBy(
    repository: string,
    deployed: string,
  ): Promise<number | null> {
    return this.cached(`compare:${deployed}`, async () => {
      const response = await this.request(
        `/repos/${repository}/compare/${deployed}...main`,
      );
      if (!response) {
        return null;
      }
      const { ahead_by } = (await response.json()) as { ahead_by: number };
      return ahead_by;
    });
  }

  private async cached<T>(
    key: string,
    load: () => Promise<T | null>,
  ): Promise<T | null> {
    const hit = this.cache.get(key) as Cached<T> | undefined;
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }
    const value = await load();
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (value === null ? FAILURE_CACHE_MS : CACHE_MS),
    });
    return value;
  }

  private async request(path: string): Promise<Response | null> {
    try {
      const response = await fetch(`${API}${path}`, {
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
        this.logger.warn(`GitHub ${path}: ${response.status}`);
        return null;
      }
      return response;
    } catch (error) {
      this.logger.warn(`GitHub ${path}: ${String(error)}`);
      return null;
    }
  }
}

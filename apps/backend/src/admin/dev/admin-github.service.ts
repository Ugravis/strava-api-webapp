import {
  ADMIN_COMMIT_KINDS,
  type AdminCommit,
  type AdminCommitBranch,
  type AdminCommitsResponse,
} from '@kilotrace/shared/admin';
import {
  type MemoryTableSpec,
  serveTablePage,
  type TablePage,
  type TableQuery,
} from '@kilotrace/shared/table';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import adminConfig, { type AdminConfig } from '../../config/admin.config';
import {
  firstParentLine,
  type GithubCommit,
  stitchHistory,
  toAdminCommit,
} from './github-commits';

const API = 'https://api.github.com';
const TIMEOUT_MS = 5000;
/** The most GitHub serves per page. */
const PER_PAGE = 100;
/** Keeps far below the rate limit of GitHub, even without a token. */
const CACHE_MS = 5 * 60 * 1000;
/** A failure is retried sooner, without asking GitHub on every page view. */
const FAILURE_CACHE_MS = 60 * 1000;
/** The whole history is read again now and then, in case a branch was rewritten. */
const FULL_RELOAD_MS = 60 * 60 * 1000;

interface Cached<T> {
  value: T | null;
  expiresAt: number;
}

interface History {
  commits: AdminCommit[];
  raw: GithubCommit[];
  loadedAt: number;
}

/** Searched, filtered, sorted and grouped in memory: GitHub does none of it. */
const COMMITS_TABLE: MemoryTableSpec<AdminCommit> = {
  search: (commit) =>
    `${commit.title} ${commit.author} ${commit.sha} ${commit.pullRequest === null ? '' : `#${commit.pullRequest}`}`,
  sorts: {
    date: (commit) => commit.date,
    title: (commit) => commit.title,
    author: (commit) => commit.author,
    pullRequest: (commit) => commit.pullRequest,
  },
  facets: {
    kind: {
      options: [...ADMIN_COMMIT_KINDS],
      values: (commit) => [commit.kind],
    },
  },
  groupings: {
    kind: (commit) => String(ADMIN_COMMIT_KINDS.indexOf(commit.kind)),
    author: (commit) => commit.author,
  },
};

/**
 * The history of the branches, read from the GitHub API: in full once,
 * then only its new commits every few minutes.
 */
@Injectable()
export class AdminGithubService {
  private readonly logger = new Logger(AdminGithubService.name);
  private readonly cache = new Map<string, Cached<unknown>>();
  private readonly histories = new Map<AdminCommitBranch, History>();

  constructor(@Inject(adminConfig.KEY) private readonly config: AdminConfig) {}

  /** Where production stands against `main`. */
  async status(): Promise<AdminCommitsResponse> {
    const repository = this.config.githubRepository;
    if (!repository) {
      return { status: 'unconfigured' };
    }
    if (!(await this.history(repository, 'main'))) {
      return { status: 'unavailable', repository };
    }
    const deployed = process.env.GIT_COMMIT || null;
    return {
      status: 'ok',
      repository,
      deployed,
      undeployed: deployed ? await this.aheadBy(repository, deployed) : null,
    };
  }

  /** A page of the data table of the commits of `branch`. */
  async table(
    query: TableQuery,
    branch: AdminCommitBranch,
  ): Promise<TablePage<AdminCommit>> {
    const repository = this.config.githubRepository;
    const commits = repository && (await this.history(repository, branch));
    if (!commits) {
      throw new ServiceUnavailableException('GitHub unavailable');
    }
    return serveTablePage(commits, COMMITS_TABLE, query);
  }

  private history(
    repository: string,
    branch: AdminCommitBranch,
  ): Promise<AdminCommit[] | null> {
    return this.cached(`history:${branch}`, async () => {
      const known = this.histories.get(branch);
      const stale = !known || Date.now() - known.loadedAt > FULL_RELOAD_MS;
      const raw = await this.load(repository, branch, stale ? [] : known.raw);
      if (!raw) {
        return null;
      }
      const line = firstParentLine(raw);
      const commits = raw.map((commit) => toAdminCommit(commit, line, branch));
      this.histories.set(branch, {
        commits,
        raw,
        loadedAt: stale ? Date.now() : known.loadedAt,
      });
      return commits;
    });
  }

  /** The commits from the head, up to those already `known`, else all of them. */
  private async load(
    repository: string,
    branch: AdminCommitBranch,
    known: GithubCommit[],
  ): Promise<GithubCommit[] | null> {
    const fresh: GithubCommit[] = [];
    for (let page = 1; ; page += 1) {
      const response = await this.request(
        `/repos/${repository}/commits?sha=${branch}&per_page=${PER_PAGE}&page=${page}`,
      );
      if (!response) {
        return null;
      }
      const commits = (await response.json()) as GithubCommit[];
      fresh.push(...commits);
      const stitched = known.length > 0 && stitchHistory(fresh, known);
      if (stitched) {
        return stitched;
      }
      if (commits.length < PER_PAGE) {
        return fresh;
      }
    }
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

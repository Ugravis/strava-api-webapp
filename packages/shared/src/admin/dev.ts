/** A library or a server the app runs on, and its version. */
export interface AdminDependencyVersion {
  name: string;
  /** Null when the version could not be read. */
  version: string | null;
}

/** A migration of the database, applied or still pending. */
export interface AdminMigration {
  name: string;
  /** Timestamp of the migration, in its name, as an ISO date. */
  createdAt: string;
  /** Rank in the `migrations` table, null for a pending one. */
  id: number | null;
}

/** `GET /api/admin/dev`: technical overview of the running backend. */
export interface AdminDevResponse {
  /** Version of the app, from its `package.json`. */
  version: string;
  /** Commit the backend was built from, null when the build did not receive it. */
  commit: string | null;
  /** When the backend process started, i.e. the last deployment or restart. */
  startedAt: string;
  environment: string;
  dependencies: AdminDependencyVersion[];
  /** Applied migrations, the latest first. */
  applied: AdminMigration[];
  /** Migrations of the code missing from the database, the oldest first. */
  pending: AdminMigration[];
}

/** Commits of `main` per page of the commits page. */
export const ADMIN_COMMITS_PER_PAGE = 30;

/** A commit of `main`, as GitHub reports it. */
export interface AdminCommit {
  sha: string;
  /** First line of the message, the title of the pull request for a merge of one. */
  title: string;
  /** Number of the merged pull request. */
  pullRequest: number | null;
  /** Name of the git author, or their GitHub login. */
  author: string;
  date: string;
  url: string;
  /** Has several parents: a pull request or a branch merged. */
  merge: boolean;
  /**
   * A merge made on `main` itself (on its first-parent line), rather than
   * one brought by a merged branch, e.g. a feature merged into `develop`.
   */
  mainMerge: boolean;
}

/** `GET /api/admin/dev/commits?page=`: commits of `main`, the latest first. */
export type AdminCommitsResponse =
  | {
      status: "ok";
      repository: string;
      commits: AdminCommit[];
      page: number;
      pages: number;
      deployed: string | null;
      /** Commits of `main` the deployed one lacks, null when unknown. */
      undeployed: number | null;
    }
  /** `GITHUB_REPOSITORY` is not set. */
  | { status: "unconfigured" }
  /** GitHub refused or did not answer (missing token on a private repository, rate limit). */
  | { status: "unavailable"; repository: string };

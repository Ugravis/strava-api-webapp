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

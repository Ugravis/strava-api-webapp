import type { AdminMigration } from '@kilotrace/shared/admin';

/** A row of the `migrations` table TypeORM keeps. */
export interface AppliedMigrationRow {
  id: number;
  timestamp: string | number;
  name: string;
}

/** Trailing timestamp of a migration name, e.g. `AddBadges1792346092412`. */
const NAME_TIMESTAMP = /(\d{13})$/;

const isoOf = (timestamp: number) => new Date(timestamp).toISOString();

/**
 * Applied migrations, the latest first, and the ones of the code missing from
 * the database, the oldest first. Matched by name, as TypeORM does.
 */
export function migrationStatus(
  known: readonly string[],
  rows: readonly AppliedMigrationRow[],
): { applied: AdminMigration[]; pending: AdminMigration[] } {
  const applied = [...rows]
    .sort((a, b) => b.id - a.id)
    .map((row) => ({
      name: row.name,
      createdAt: isoOf(Number(row.timestamp)),
      id: row.id,
    }));
  const done = new Set(rows.map((row) => row.name));
  const pending = known
    .filter((name) => !done.has(name))
    .map((name) => ({
      name,
      createdAt: isoOf(Number(NAME_TIMESTAMP.exec(name)?.[1] ?? 0)),
      id: null,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { applied, pending };
}

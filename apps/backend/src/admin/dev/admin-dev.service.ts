import type {
  AdminDependencyVersion,
  AdminDevResponse,
} from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { type AppliedMigrationRow, migrationStatus } from './migration-status';
import { appVersion, dependencyVersion } from './package-version';

/** Libraries of the backend worth knowing the version of. */
const LIBRARIES = ['@nestjs/core', 'typeorm', 'pg'] as const;

const LIBRARY_NAMES: Record<(typeof LIBRARIES)[number], string> = {
  '@nestjs/core': 'NestJS',
  typeorm: 'TypeORM',
  pg: 'node-postgres',
};

/** Read once: neither changes while the process runs. */
const VERSION = appVersion();
const STARTED_AT = new Date(Date.now() - process.uptime() * 1000).toISOString();

@Injectable()
export class AdminDevService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview(): Promise<AdminDevResponse> {
    const [postgres, postgis, rows] = await Promise.all([
      this.scalar<{ server_version: string }>('SHOW server_version'),
      this.scalar<{ version: string }>(
        'SELECT postgis_lib_version() AS version',
      ),
      this.dataSource.query<AppliedMigrationRow[]>(
        `SELECT id, timestamp, name FROM ${this.migrationsTable()}`,
      ),
    ]);
    const known = this.dataSource.migrations.map(
      (migration) => migration.name ?? migration.constructor.name,
    );

    return {
      version: VERSION,
      commit: process.env.GIT_COMMIT || null,
      startedAt: STARTED_AT,
      environment: process.env.NODE_ENV ?? 'development',
      dependencies: [
        { name: 'Node.js', version: process.versions.node },
        ...LIBRARIES.map((library): AdminDependencyVersion => ({
          name: LIBRARY_NAMES[library],
          version: dependencyVersion(library),
        })),
        // The build details after the number, e.g. `17.5 (Debian 17.5-1)`.
        {
          name: 'PostgreSQL',
          version: postgres?.server_version.split(' ')[0] ?? null,
        },
        { name: 'PostGIS', version: postgis?.version ?? null },
      ],
      ...migrationStatus(known, rows),
    };
  }

  /** First row of a query, null when it fails (e.g. a missing extension). */
  private async scalar<Row>(sql: string): Promise<Row | null> {
    try {
      const [row] = await this.dataSource.query<Row[]>(sql);
      return row ?? null;
    } catch {
      return null;
    }
  }

  private migrationsTable(): string {
    const { migrationsTableName } = this.dataSource.options;
    return `"${migrationsTableName ?? 'migrations'}"`;
  }
}

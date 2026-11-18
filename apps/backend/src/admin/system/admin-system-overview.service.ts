import type { AdminSystemOverview } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** The figures of the maintenance page: accounts, and what waits for the Strava worker. */
@Injectable()
export class AdminSystemOverviewService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async overview(): Promise<AdminSystemOverview> {
    const [row] = await this.dataSource.query<
      { accounts: number; events: number; jobs: number }[]
    >(
      `SELECT
         (SELECT count(*) FROM users)::int AS accounts,
         (SELECT count(*) FROM strava_webhook_events WHERE processed_at IS NULL)::int AS events,
         (SELECT count(*) FROM sync_jobs WHERE status IN ('queued', 'running'))::int AS jobs`,
    );
    return {
      accounts: row.accounts,
      strava: { pendingEvents: row.events, pendingJobs: row.jobs },
    };
  }
}

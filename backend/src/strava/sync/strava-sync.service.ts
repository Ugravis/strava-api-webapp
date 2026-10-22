import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ActivitiesService,
  type ActivityData,
} from '../../activities/activities.service';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import type { ProviderConnection } from '../../connections/provider-connection.entity';
import type { SyncJob } from '../../connections/sync-job.entity';
import { SyncJobsService } from '../../connections/sync-jobs.service';
import { StravaApiClient } from '../api/strava-api.client';
import type { StravaActivity } from '../api/strava-api.types';
import {
  StravaApiError,
  StravaAuthorizationRevokedError,
  StravaRateLimitedError,
} from '../api/strava-api.errors';
import { toActivityData } from '../strava-activity.mapper';
import { StravaConnectionService } from '../strava-connection.service';
import { StravaTilesService } from '../tiles/strava-tiles.service';

const PROVIDER = 'strava';

interface ImportedActivity {
  activityId: string;
  activity: StravaActivity;
  data: ActivityData;
}
/** Largest page accepted by Strava. */
const MAX_PAGE_SIZE = 200;
/** Progress is saved every few activities, so that it moves smoothly. */
const PROGRESS_STEP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Imports activity summaries from Strava. No location data is stored. */
@Injectable()
export class StravaSyncService {
  private readonly logger = new Logger(StravaSyncService.name);

  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly api: StravaApiClient,
    private readonly connections: StravaConnectionService,
    private readonly activities: ActivitiesService,
    private readonly syncJobs: SyncJobsService,
    private readonly tiles: StravaTilesService,
  ) {}

  /** Runs a claimed job to completion, or puts it back in the queue. */
  async run(job: SyncJob): Promise<void> {
    const connection = await this.connections.findById(job.connectionId);
    if (!connection) {
      return;
    }
    try {
      if (job.kind === 'backfill') {
        await this.backfill(job, connection);
        await this.tiles.markUnhandledAsNoTrack(connection.userId);
      } else {
        await this.reconcile(job, connection);
      }
      await this.enforceMaxActivities(connection.userId);
      await this.connections.markSynced(connection.id);
      await this.syncJobs.complete(job);
    } catch (error) {
      await this.handleError(job, connection, error);
    }
  }

  /**
   * Pages through the history, most recent first, up to the configured
   * maximum. Resumes at `job.nextPage` after an interruption.
   */
  private async backfill(
    job: SyncJob,
    connection: ProviderConnection,
  ): Promise<void> {
    const max = this.config.syncMaxActivities;
    const perPage = max === null ? MAX_PAGE_SIZE : Math.min(MAX_PAGE_SIZE, max);
    let page = job.nextPage;
    // Every page before the current one was full: a resumed job recounts the
    // current page from its start instead of counting it twice.
    let processed = (page - 1) * perPage;

    while (max === null || processed < max) {
      const token = await this.connections.accessToken(connection.id);
      const batch = await this.api.listActivities(token, { page, perPage });
      const remaining = max === null ? batch.length : max - processed;

      const imported: ImportedActivity[] = [];
      for (const activity of batch.slice(0, remaining)) {
        imported.push(await this.import(connection, activity));
        processed++;
        if (processed % PROGRESS_STEP === 0) {
          await this.syncJobs.saveProgress(job, {
            processed,
            total: null,
            nextPage: page,
          });
        }
      }
      await this.tiles.fromSummaries(connection.userId, imported);
      page++;
      await this.syncJobs.saveProgress(job, {
        processed,
        total: null,
        nextPage: page,
      });
      if (batch.length < perPage) {
        break;
      }
    }
    await this.syncJobs.saveProgress(job, {
      processed,
      total: processed,
      nextPage: page,
    });
  }

  /**
   * Re-reads the recent window and aligns it: catches the creations, updates
   * and deletions whose webhook event was missed (backend down, no tunnel).
   */
  private async reconcile(
    job: SyncJob,
    connection: ProviderConnection,
  ): Promise<void> {
    const since = new Date(
      Date.now() - this.config.reconcileWindowDays * DAY_MS,
    );
    const seen: string[] = [];
    let page = 1;
    for (;;) {
      const token = await this.connections.accessToken(connection.id);
      const batch = await this.api.listActivities(token, {
        page,
        perPage: MAX_PAGE_SIZE,
        after: since,
      });
      const imported: ImportedActivity[] = [];
      for (const activity of batch) {
        imported.push(await this.import(connection, activity));
        seen.push(String(activity.id));
      }
      await this.tiles.fromSummaries(connection.userId, imported);
      await this.syncJobs.saveProgress(job, {
        processed: seen.length,
        total: null,
        nextPage: page,
      });
      if (batch.length < MAX_PAGE_SIZE) {
        break;
      }
      page++;
    }
    const removed = await this.activities.removeMissingFromProvider(
      connection.userId,
      PROVIDER,
      since,
      seen,
    );
    if (removed > 0) {
      this.logger.log(
        `Reconciliation removed ${removed} deleted activities of connection ${connection.id}`,
      );
    }
    await this.syncJobs.saveProgress(job, {
      processed: seen.length,
      total: seen.length,
      nextPage: page,
    });
  }

  private async import(
    connection: ProviderConnection,
    activity: StravaActivity,
  ): Promise<ImportedActivity> {
    const data = toActivityData(activity);
    const activityId = await this.activities.upsertFromProvider(
      connection.userId,
      PROVIDER,
      String(activity.id),
      data,
    );
    return { activityId, activity, data };
  }

  /** Temporary development cap: only the most recent activities are kept. */
  private async enforceMaxActivities(userId: string): Promise<void> {
    if (this.config.syncMaxActivities !== null) {
      await this.activities.keepMostRecentFromProvider(
        userId,
        PROVIDER,
        this.config.syncMaxActivities,
      );
    }
  }

  private async handleError(
    job: SyncJob,
    connection: ProviderConnection,
    error: unknown,
  ): Promise<void> {
    if (error instanceof StravaRateLimitedError) {
      this.logger.log(
        `Sync job ${job.id} waits for the Strava quota until ${error.retryAt.toISOString()}`,
      );
      await this.syncJobs.defer(job, error.retryAt, 'RATE_LIMITED');
      return;
    }
    if (error instanceof StravaAuthorizationRevokedError) {
      await this.connections.handleRevoked(connection);
      return;
    }
    this.logger.error(
      `Sync job ${job.id} failed (attempt ${job.attempts}): ${String(error)}`,
    );
    await this.syncJobs.fail(
      job,
      error instanceof StravaApiError ? `STRAVA_${error.status}` : 'UNEXPECTED',
    );
  }
}

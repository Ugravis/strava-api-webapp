import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import stravaConfig, { type StravaConfig } from '../../config/strava.config';
import { SyncJobsService } from '../../connections/sync-jobs.service';
import { StravaApiClient } from '../api/strava-api.client';
import { StravaConnectionService } from '../strava-connection.service';
import { StravaWebhookService } from '../webhooks/strava-webhook.service';
import { StravaSyncService } from './strava-sync.service';

const HOUR_MS = 60 * 60 * 1000;
const MAINTENANCE_INTERVAL_MS = HOUR_MS;
const HISTORY_RETENTION_MS = 7 * 24 * HOUR_MS;

/**
 * In-process background worker. Strava quotas are shared by the whole
 * application, so the work is processed one item at a time: webhook events
 * first (small and time-sensitive), then synchronization jobs. The queue
 * lives in the database, so nothing is lost when the process restarts.
 */
@Injectable()
export class StravaWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StravaWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private lastMaintenance = 0;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(
    @Inject(stravaConfig.KEY) private readonly config: StravaConfig,
    private readonly api: StravaApiClient,
    private readonly syncJobs: SyncJobsService,
    private readonly sync: StravaSyncService,
    private readonly webhooks: StravaWebhookService,
    private readonly connections: StravaConnectionService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.workerEnabled || !this.api.isEnabled) {
      this.logger.log('Strava worker disabled');
      return;
    }
    const requeued = await this.syncJobs.requeueInterrupted();
    if (requeued > 0) {
      this.logger.log(`Resuming ${requeued} interrupted sync job(s)`);
    }
    this.schedule(0);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    await this.current;
  }

  private schedule(delayMs: number): void {
    if (this.stopped) {
      return;
    }
    this.timer = setTimeout(() => {
      this.current = this.tick().then(
        (didWork) =>
          this.schedule(didWork ? 0 : this.config.workerPollIntervalMs),
        (error: unknown) => {
          this.logger.error(`Strava worker tick failed: ${String(error)}`);
          this.schedule(this.config.workerPollIntervalMs);
        },
      );
    }, delayMs);
  }

  /** Processes at most one item; returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    if (Date.now() - this.lastMaintenance >= MAINTENANCE_INTERVAL_MS) {
      this.lastMaintenance = Date.now();
      await this.maintain();
    }
    const event = await this.webhooks.claimNext();
    if (event) {
      await this.webhooks.process(event);
      return true;
    }
    const job = await this.syncJobs.claimNext();
    if (job) {
      await this.sync.run(job);
      return true;
    }
    return false;
  }

  /**
   * Queues a reconciliation for connections not synchronized recently. Run
   * at startup too, which catches up on the events missed while down.
   */
  private async maintain(): Promise<void> {
    const due = await this.connections.findSyncedBefore(
      new Date(Date.now() - this.config.reconcileIntervalHours * HOUR_MS),
    );
    for (const connection of due) {
      await this.syncJobs.enqueue(
        connection.id,
        connection.lastSyncedAt ? 'reconcile' : 'backfill',
      );
    }
    const historyLimit = new Date(Date.now() - HISTORY_RETENTION_MS);
    await this.syncJobs.purgeFinishedBefore(historyLimit);
    await this.webhooks.purgeProcessedBefore(historyLimit);
  }
}

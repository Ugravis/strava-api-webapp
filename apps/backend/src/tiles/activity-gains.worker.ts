import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { ActivityGains } from './activity-gains';
import {
  ActivityGainsService,
  type PackedActivityCells,
} from './activity-gains.service';

const POLL_INTERVAL_MS = 2_000;
/** Above this duration, a computation is logged. */
const SLOW_COMPUTATION_MS = 1_000;

/** Replays the gains in a worker thread, created for each computation. */
function computeInThread(cells: PackedActivityCells): Promise<ActivityGains[]> {
  return new Promise((resolve, reject) => {
    const thread = new Worker(join(__dirname, 'activity-gains.thread.js'));
    thread.once('message', (gains: ActivityGains[]) => {
      resolve(gains);
      void thread.terminate();
    });
    thread.once('error', reject);
    thread.once('exit', (code) =>
      reject(new Error(`Activity gains thread exited with code ${code}`)),
    );
    thread.postMessage(cells, [
      cells.activities.buffer,
      cells.xs.buffer,
      cells.ys.buffer,
      cells.masks.buffer,
    ]);
  });
}

/**
 * In-process background worker replaying, whenever the tiles of a user
 * change, what each of their activities brought when it was recorded: new
 * tiles and growth of the clusters. An activity imported late changes the
 * gains of those recorded after it.
 */
@Injectable()
export class ActivityGainsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ActivityGainsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly gains: ActivityGainsService) {}

  onApplicationBootstrap(): void {
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
        (didWork) => this.schedule(didWork ? 0 : POLL_INTERVAL_MS),
        (error: unknown) => {
          this.logger.error(
            `Activity gains worker tick failed: ${String(error)}`,
          );
          this.schedule(POLL_INTERVAL_MS);
        },
      );
    }, delayMs);
  }

  /** Returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    const stale = await this.gains.nextStale();
    if (!stale) {
      return false;
    }
    const startedAt = Date.now();
    const { ids, cells } = await this.gains.packedCells(stale.userId);
    const gains = await computeInThread(cells);
    await this.gains.save(stale, ids, gains);
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= SLOW_COMPUTATION_MS) {
      this.logger.log(
        `Gains of ${ids.length} activities replayed in ${elapsedMs} ms`,
      );
    }
    return true;
  }
}

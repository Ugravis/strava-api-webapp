import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { PackedCells, PackedMetrics } from './tile-metrics-packing';
import { UserTilesService } from './user-tiles.service';

const POLL_INTERVAL_MS = 2_000;
/** Above this duration, a computation is logged. */
const SLOW_COMPUTATION_MS = 1_000;

/** Computes the metrics in a worker thread, created for each computation. */
function computeInThread(cells: PackedCells): Promise<PackedMetrics> {
  return new Promise((resolve, reject) => {
    const thread = new Worker(join(__dirname, 'tile-metrics.thread.js'));
    thread.once('message', (metrics: PackedMetrics) => {
      resolve(metrics);
      void thread.terminate();
    });
    thread.once('error', reject);
    thread.once('exit', (code) =>
      reject(new Error(`Tile metrics thread exited with code ${code}`)),
    );
    thread.postMessage(cells, [
      cells.xs.buffer,
      cells.ys.buffer,
      cells.masks.buffer,
    ]);
  });
}

/**
 * In-process background worker computing the metrics of the tiles (largest
 * square, clusters) whenever the tiles of a user change, outside of the
 * requests and of the event loop: they take about a second for an athlete
 * with years of history.
 */
@Injectable()
export class TileMetricsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TileMetricsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly userTiles: UserTilesService) {}

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
            `Tile metrics worker tick failed: ${String(error)}`,
          );
          this.schedule(POLL_INTERVAL_MS);
        },
      );
    }, delayMs);
  }

  /** Returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    const stale = await this.userTiles.nextStale();
    if (!stale) {
      return false;
    }
    const startedAt = Date.now();
    const cells = await this.userTiles.packedCells(stale.userId);
    const metrics = await computeInThread(cells);
    await this.userTiles.saveMetrics(stale, metrics);
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= SLOW_COMPUTATION_MS) {
      this.logger.log(
        `Tile metrics of ${metrics.metrics.subtiles.visited} small tiles computed in ${elapsedMs} ms`,
      );
    }
    return true;
  }
}

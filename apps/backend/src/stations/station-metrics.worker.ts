import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { StationMetricsService } from './station-metrics.service';

const POLL_INTERVAL_MS = 2_000;
/** Above this duration, a computation is logged. */
const SLOW_COMPUTATION_MS = 1_000;

/**
 * In-process background worker computing the metrics of the stations
 * visited by a user whenever their tiles or the stations change, outside of
 * the requests: after an import, every user in turn.
 */
@Injectable()
export class StationMetricsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StationMetricsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly metrics: StationMetricsService) {}

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
            `Station metrics worker tick failed: ${String(error)}`,
          );
          this.schedule(POLL_INTERVAL_MS);
        },
      );
    }, delayMs);
  }

  /** Returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    const stale = await this.metrics.nextStale();
    if (!stale) {
      return false;
    }
    const startedAt = Date.now();
    const size = await this.metrics.compute(stale);
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= SLOW_COMPUTATION_MS) {
      this.logger.log(
        `Largest station network of ${size} stations computed in ${elapsedMs} ms`,
      );
    }
    return true;
  }
}

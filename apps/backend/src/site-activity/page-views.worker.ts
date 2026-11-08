import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { PageViewsService } from './page-views.service';

/** Frequent enough for a retention counted in days. */
const INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Leaves the start of the backend to the requests. */
const FIRST_DELAY_MS = 60_000;

/** In-process worker summing up the page views past their retention. */
@Injectable()
export class PageViewsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(PageViewsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly pageViews: PageViewsService) {}

  onApplicationBootstrap(): void {
    this.schedule(FIRST_DELAY_MS);
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
      this.current = this.pageViews
        .summarize()
        .then(
          (moved) => {
            if (moved > 0) {
              this.logger.log(`${moved} page views summed up`);
            }
          },
          (error: unknown) => {
            this.logger.error(`Page views summary failed: ${String(error)}`);
          },
        )
        .finally(() => this.schedule(INTERVAL_MS));
    }, delayMs);
  }
}

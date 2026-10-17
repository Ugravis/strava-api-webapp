import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { CountriesService } from './countries.service';

/** Large tiles located per transaction. */
const LOCATE_BATCH = 200;
const POLL_INTERVAL_MS = 30_000;

/**
 * In-process background worker locating the visited tiles in the countries,
 * then computing the tile totals of the countries visited for the first
 * time. Independent of the activity providers: no external request.
 */
@Injectable()
export class CountriesWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(CountriesWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();

  constructor(private readonly countries: CountriesService) {}

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
          this.logger.error(`Countries worker tick failed: ${String(error)}`);
          this.schedule(POLL_INTERVAL_MS);
        },
      );
    }, delayMs);
  }

  /** Returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    // Without boundaries (`pnpm countries:import` not run), every tile
    // would be located at sea.
    if (!(await this.countries.hasCountries())) {
      return false;
    }
    if ((await this.countries.locateTiles(LOCATE_BATCH)) > 0) {
      return true;
    }
    const code = await this.countries.nextCountryWithoutTotals();
    if (!code) {
      return false;
    }
    const startedAt = Date.now();
    const totals = await this.countries.computeTotals(code);
    this.logger.log(
      `Tile totals of ${code}: ${totals.tiles} large, ${totals.subtiles} small (${Date.now() - startedAt} ms)`,
    );
    return true;
  }
}

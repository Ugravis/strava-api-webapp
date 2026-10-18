import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { OverpassClient } from './overpass/overpass-client';
import { parseRailways, railwaysQuery } from './overpass/overpass-queries';
import {
  type GraphStation,
  RailGraph,
  REGION_BUFFER_M,
  type RegionRef,
  regionBbox,
} from './rail-graph';
import { StationsService } from './stations.service';

const POLL_INTERVAL_MS = 30_000;
/** Stations walked per tick, on one graph. */
const LINK_BATCH = 200;
/** Regions loaded for one walk before it is left for a later tick. */
const MAX_REGIONS_PER_WALK = 25;
/**
 * Downloaded from Overpass over the last day, at most: half of what its
 * usage policy allows. Beyond, the regions wait.
 */
const DAILY_BUDGET_BYTES = 500_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-process background worker finding the links of the visited stations:
 * it requests the regions of the stations visited, fetches their railway
 * from OpenStreetMap through the Overpass API, one region at a time, then
 * walks the tracks from each station to its neighbors.
 */
@Injectable()
export class StationsWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StationsWorker.name);
  private readonly overpass = new OverpassClient();
  private timer: NodeJS.Timeout | null = null;
  private stopped = false;
  private current: Promise<void> = Promise.resolve();
  /** Large tiles changed after it are looked at for visited stations. */
  private seq = '0';
  /** Version of the stations when `seq` was taken: an import looks at every tile again. */
  private stationsVersion: string | null = null;
  /** Answers of Overpass over the last day: when, and their size. */
  private downloads: { at: number; bytes: number }[] = [];

  constructor(private readonly stations: StationsService) {}

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
          this.logger.error(`Stations worker tick failed: ${String(error)}`);
          this.schedule(POLL_INTERVAL_MS);
        },
      );
    }, delayMs);
  }

  /** Returns whether there was something to do. */
  private async tick(): Promise<boolean> {
    // Without stations (`pnpm stations:import` not run), nothing to link.
    const version = await this.stations.stationsVersion();
    if (version === null) {
      return false;
    }
    if (version !== this.stationsVersion) {
      this.seq = '0';
      this.stationsVersion = version;
    }
    this.seq = await this.stations.requestVisited(this.seq);
    const region = this.withinBudget()
      ? await this.stations.nextRegionToFetch()
      : null;
    if (region) {
      await this.fetchRegion(region);
    }
    // Between two regions: the links of the stations whose regions are all
    // fetched appear without waiting for every other region.
    const linked = await this.linkStations();
    return region !== null || linked;
  }

  private withinBudget(): boolean {
    const since = Date.now() - DAY_MS;
    this.downloads = this.downloads.filter(({ at }) => at >= since);
    const bytes = this.downloads.reduce((total, d) => total + d.bytes, 0);
    return bytes < DAILY_BUDGET_BYTES;
  }

  private async fetchRegion(region: RegionRef): Promise<void> {
    const startedAt = Date.now();
    try {
      const body = await this.overpass.query(
        railwaysQuery(regionBbox(region, REGION_BUFFER_M)),
      );
      this.downloads.push({ at: Date.now(), bytes: body.length });
      const { ways, osmTimestamp } = parseRailways(body);
      await this.stations.saveRegion(region, ways, osmTimestamp);
      this.logger.log(
        `Railway of region ${region.x}/${region.y}: ${ways.length} ways (${Date.now() - startedAt} ms)`,
      );
    } catch (error) {
      this.logger.warn(
        `Railway of region ${region.x}/${region.y} not fetched: ${String(error)}`,
      );
      await this.stations.failRegion(region, String(error));
    }
  }

  /**
   * Walks from a batch of stations on one graph, loading the regions they
   * reach. A walk reaching a region without its railway requests it and is
   * tried again once a region is fetched.
   */
  private async linkStations(): Promise<boolean> {
    const batch = await this.stations.nextStationsToLink(LINK_BATCH);
    if (batch.length === 0) {
      return false;
    }
    const startedAt = Date.now();
    const graph = new RailGraph();
    let linked = 0;
    let links = 0;
    for (const station of batch) {
      try {
        const found = await this.linkStation(graph, station);
        if (found !== null) {
          linked++;
          links += found;
        }
      } catch (error) {
        // Left for the next fetch of a region, without holding the others back.
        this.logger.warn(
          `Links of station ${station.id} not found: ${String(error)}`,
        );
        await this.stations.markChecked(station.id);
      }
      // Lets the requests of the users through between two walks.
      await new Promise((resolve) => setImmediate(resolve));
    }
    this.logger.log(
      `Links of ${linked}/${batch.length} stations: ${links} links (${Date.now() - startedAt} ms)`,
    );
    return true;
  }

  /**
   * Walks from one station, loading the fetched regions it reaches. Returns
   * the number of links saved, or null when the walk waits for regions,
   * which are requested.
   */
  private async linkStation(
    graph: RailGraph,
    station: GraphStation & { region: RegionRef },
  ): Promise<number | null> {
    if (!graph.isLoaded(station.region)) {
      await this.stations.loadRegion(graph, station.region);
    }
    let result = graph.walk(station.id);
    let loads = 0;
    while (result.missing.length > 0 && loads < MAX_REGIONS_PER_WALK) {
      const fetched = await this.stations.fetchedRegions(result.missing);
      if (fetched.length === 0) {
        break;
      }
      for (const region of fetched) {
        await this.stations.loadRegion(graph, region);
        loads++;
      }
      result = graph.walk(station.id);
    }
    if (result.missing.length > 0) {
      await this.stations.requestRegions(result.missing);
      await this.stations.markChecked(station.id);
      return null;
    }
    await this.stations.saveLinks(station.id, result.links);
    return result.links.length;
  }
}

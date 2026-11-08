import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StationsService } from '../stations/stations.service';
import { type DevOverview, DevOverviewService } from './dev-overview.service';

/** Development only: registered by `DevModule.forEnvironment()`. */
@SkipThrottle()
@Controller('dev')
export class DevController {
  constructor(
    private readonly overview: DevOverviewService,
    private readonly stations: StationsService,
  ) {}

  @Get('overview')
  get(): Promise<DevOverview> {
    return this.overview.overview();
  }

  /** Report of the latest import of the stations, for the admin page. */
  @Get('railway-import')
  railwayImport(): ReturnType<StationsService['latestImport']> {
    return this.stations.latestImport();
  }
}

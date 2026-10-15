import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { type DevOverview, DevOverviewService } from './dev-overview.service';

/** Development only: registered by `DevModule.forEnvironment()`. */
@SkipThrottle()
@Controller('dev')
export class DevController {
  constructor(private readonly overview: DevOverviewService) {}

  @Get('overview')
  get(): Promise<DevOverview> {
    return this.overview.overview();
  }
}

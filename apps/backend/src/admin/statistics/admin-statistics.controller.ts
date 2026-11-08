import {
  type AdminExplorationResponse,
  type AdminStatisticsResponse,
} from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { AdminExplorationService } from './admin-exploration.service';
import { AdminStatisticsService } from './admin-statistics.service';

@AdminController('statistics')
export class AdminStatisticsController {
  constructor(
    private readonly statistics: AdminStatisticsService,
    private readonly exploration: AdminExplorationService,
  ) {}

  /** Aggregated figures only, hence open to the support. */
  @Get()
  @AnyMember()
  get(): Promise<AdminStatisticsResponse> {
    return this.statistics.statistics();
  }

  /** Union of the tiles and stations of every user, without any one of them. */
  @Get('exploration')
  @AnyMember()
  getExploration(): Promise<AdminExplorationResponse> {
    return this.exploration.exploration();
  }
}

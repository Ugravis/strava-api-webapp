import {
  AdminRole,
  type AdminStatisticsResponse,
} from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { Roles } from '../access/roles.decorator';
import { AdminStatisticsService } from './admin-statistics.service';

@AdminController('statistics')
export class AdminStatisticsController {
  constructor(private readonly statistics: AdminStatisticsService) {}

  /** Aggregated figures only, hence open to the support. */
  @Get()
  @Roles(AdminRole.Support)
  get(): Promise<AdminStatisticsResponse> {
    return this.statistics.statistics();
  }
}

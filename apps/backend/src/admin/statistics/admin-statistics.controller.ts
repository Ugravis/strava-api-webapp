import { type AdminStatisticsResponse } from '@kilotrace/shared/admin';
import { Get } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { AdminStatisticsService } from './admin-statistics.service';

@AdminController('statistics')
export class AdminStatisticsController {
  constructor(private readonly statistics: AdminStatisticsService) {}

  /** Aggregated figures only, hence open to the support. */
  @Get()
  @AnyMember()
  get(): Promise<AdminStatisticsResponse> {
    return this.statistics.statistics();
  }
}

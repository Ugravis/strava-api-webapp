import {
  ADMIN_BUSINESS_SECTIONS,
  type AdminBusinessResponses,
  type AdminBusinessSection,
} from '@kilotrace/shared/admin';
import { Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AdminController } from '../access/admin-controller.decorator';
import { adminNotFound } from '../access/admin-not-found';
import { AnyMember } from '../access/permission.decorator';
import { AdminBusinessStatisticsQueryDto } from './admin-business-statistics-query.dto';
import { AdminBusinessStatisticsService } from './admin-business-statistics.service';

const isSection = (value: string): value is AdminBusinessSection =>
  (ADMIN_BUSINESS_SECTIONS as readonly string[]).includes(value);

@AdminController('business-statistics')
export class AdminBusinessStatisticsController {
  constructor(private readonly statistics: AdminBusinessStatisticsService) {}

  /** Aggregated figures only, hence open to the support, as the statistics. */
  @Get(':section')
  @AnyMember()
  get(
    @Param('section') section: string,
    @Query() query: AdminBusinessStatisticsQueryDto,
    @Req() request: Request,
  ): Promise<AdminBusinessResponses[AdminBusinessSection]> {
    if (!isSection(section)) {
      throw adminNotFound(request);
    }
    return this.statistics.section(section, query.period, query.team);
  }
}

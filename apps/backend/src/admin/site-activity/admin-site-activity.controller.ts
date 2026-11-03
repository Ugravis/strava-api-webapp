import {
  ADMIN_SITE_ACTIVITY_SECTIONS,
  type AdminSiteActivityResponses,
  type AdminSiteActivitySection,
} from '@kilotrace/shared/admin';
import { Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AdminController } from '../access/admin-controller.decorator';
import { adminNotFound } from '../access/admin-not-found';
import { AnyMember } from '../access/permission.decorator';
import { AdminSiteActivityQueryDto } from './admin-site-activity-query.dto';
import { AdminSiteActivityService } from './admin-site-activity.service';

const isSection = (value: string): value is AdminSiteActivitySection =>
  (ADMIN_SITE_ACTIVITY_SECTIONS as readonly string[]).includes(value);

@AdminController('site-activity')
export class AdminSiteActivityController {
  constructor(private readonly siteActivity: AdminSiteActivityService) {}

  /** Aggregated figures only, hence open to the support, as the statistics. */
  @Get(':section')
  @AnyMember()
  get(
    @Param('section') section: string,
    @Query() query: AdminSiteActivityQueryDto,
    @Req() request: Request,
  ): Promise<AdminSiteActivityResponses[AdminSiteActivitySection]> {
    if (!isSection(section)) {
      throw adminNotFound(request);
    }
    return this.siteActivity.section(section, query.days, query.team, query.admin);
  }
}

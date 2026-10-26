import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import { ActivityDaysQueryDto } from './activity-days-query.dto';
import {
  ActivitiesService,
  type ActivitiesOverview,
  type ActivityDay,
  type ActivityDetails,
  type MonthDistance,
  type ActivityStats,
} from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get('stats')
  stats(@CurrentUser() user: User): Promise<ActivityStats> {
    return this.activities.stats(user.id);
  }

  /** Latest activities, days of the last year and sports, for the home page. */
  @Get('overview')
  overview(@CurrentUser() user: User): Promise<ActivitiesOverview> {
    return this.activities.overview(user.id);
  }

  /** Distance of every month since the first activity, in total and by family of sports. */
  @Get('monthly')
  monthly(@CurrentUser() user: User): Promise<MonthDistance[]> {
    return this.activities.monthly(user.id);
  }

  /** Days with activities of a calendar year, for its calendar. */
  @Get('days')
  days(
    @CurrentUser() user: User,
    @Query() { year }: ActivityDaysQueryDto,
  ): Promise<ActivityDay[]> {
    return this.activities.yearDays(user.id, year);
  }

  /**
   * Activities expected on the map; their tracks are fetched separately.
   * Requested whenever the app opens: revalidated from its entity tag, it is
   * only downloaded again once the activities changed.
   */
  @Get('mappable')
  async mappable(
    @CurrentUser() user: User,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const tag = await this.activities.listTag(user.id);
    response.set({ ETag: tag, 'Cache-Control': 'private, no-cache' });
    if (request.fresh) {
      response.status(304).end();
      return;
    }
    response.json(await this.activities.mappable(user.id));
  }

  /** One activity of the user. Declared last: the named routes above are not identifiers. */
  @Get(':id')
  async details(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityDetails> {
    const activity = await this.activities.details(user.id, id);
    if (!activity) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such activity');
    }
    return activity;
  }
}

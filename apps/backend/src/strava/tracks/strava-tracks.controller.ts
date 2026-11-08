import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { User } from '../../users/user.entity';
import { ActivityTracksQueryDto } from './activity-tracks-query.dto';
import {
  type ActivityTracksPage,
  StravaTracksService,
} from './strava-tracks.service';

@Controller('connections/strava/tracks')
export class StravaTracksController {
  constructor(private readonly tracks: StravaTracksService) {}

  /** Each call costs one request of the shared Strava quota. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get()
  list(
    @CurrentUser() user: User,
    @Query() query: ActivityTracksQueryDto,
  ): Promise<ActivityTracksPage> {
    return this.tracks.page(user.id, query);
  }
}

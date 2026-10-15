import { Controller, Get } from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { DISTANCE_LANDMARKS } from './distance-landmarks';
import { distancesOverview, type DistancesOverview } from './distance-progress';

/** Compares the cumulated distances of the user to known distances. */
@Controller('distances')
export class DistancesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async overview(@CurrentUser() user: User): Promise<DistancesOverview> {
    return distancesOverview(
      DISTANCE_LANDMARKS,
      await this.activities.distanceBySportType(user.id),
    );
  }
}

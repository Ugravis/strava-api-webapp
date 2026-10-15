import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { ActivitiesService, type ActivityStats } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get('stats')
  stats(@CurrentUser() user: User): Promise<ActivityStats> {
    return this.activities.stats(user.id);
  }
}

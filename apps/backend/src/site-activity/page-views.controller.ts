import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { PageViewBeaconDto } from './page-views.dto';
import { PageViewsService } from './page-views.service';

/** Pages seen by the signed-in users, for the statistics of the back office only. */
@Controller('page-views')
export class PageViewsController {
  constructor(private readonly pageViews: PageViewsService) {}

  @Post()
  @HttpCode(204)
  async record(
    @CurrentUser() user: User,
    @Body() beacon: PageViewBeaconDto,
  ): Promise<void> {
    await this.pageViews.record(user.id, beacon);
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageQueryDaily } from './page-query-daily.entity';
import { PageView } from './page-view.entity';
import { PageViewDaily } from './page-view-daily.entity';
import { PageViewQuery } from './page-view-query.entity';
import { PageViewsController } from './page-views.controller';
import { PageViewsService } from './page-views.service';
import { PageViewsWorker } from './page-views.worker';
import { UserActivity } from './user-activity.entity';
import { UserActivityService } from './user-activity.service';

/** First-party usage of the site by the signed-in users: no cookie, no third party. */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserActivity,
      PageView,
      PageViewQuery,
      PageViewDaily,
      PageQueryDaily,
    ]),
  ],
  controllers: [PageViewsController],
  providers: [UserActivityService, PageViewsService, PageViewsWorker],
  exports: [UserActivityService],
})
export class SiteActivityModule {}

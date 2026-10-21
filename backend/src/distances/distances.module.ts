import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { StationsModule } from '../stations/stations.module';
import { Badge } from './badge.entity';
import { BadgeTheme } from './badge-theme.entity';
import { DistancesController } from './distances.controller';
import { DistancesService } from './distances.service';
import { UserFavoriteBadge } from './user-favorite-badge.entity';
import { UserProfileBadge } from './user-profile-badge.entity';

@Module({
  imports: [
    ActivitiesModule,
    StationsModule,
    TypeOrmModule.forFeature([
      Badge,
      BadgeTheme,
      UserFavoriteBadge,
      UserProfileBadge,
    ]),
  ],
  controllers: [DistancesController],
  providers: [DistancesService],
})
export class DistancesModule {}

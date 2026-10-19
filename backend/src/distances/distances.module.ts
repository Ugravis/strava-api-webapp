import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { Badge } from './badge.entity';
import { BadgeTheme } from './badge-theme.entity';
import { DistancesController } from './distances.controller';
import { DistancesService } from './distances.service';
import { UserFavoriteBadge } from './user-favorite-badge.entity';

@Module({
  imports: [
    ActivitiesModule,
    TypeOrmModule.forFeature([Badge, BadgeTheme, UserFavoriteBadge]),
  ],
  controllers: [DistancesController],
  providers: [DistancesService],
})
export class DistancesModule {}

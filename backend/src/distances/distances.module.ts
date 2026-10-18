import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { Badge } from './badge.entity';
import { DistancesController } from './distances.controller';
import { DistancesService } from './distances.service';
import { UserBadgePin } from './user-badge-pin.entity';

@Module({
  imports: [ActivitiesModule, TypeOrmModule.forFeature([Badge, UserBadgePin])],
  controllers: [DistancesController],
  providers: [DistancesService],
})
export class DistancesModule {}

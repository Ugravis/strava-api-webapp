import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { DistancesController } from './distances.controller';

@Module({
  imports: [ActivitiesModule],
  controllers: [DistancesController],
})
export class DistancesModule {}

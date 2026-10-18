import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Place } from './place.entity';
import { RailLink } from './rail-link.entity';
import { RailRegion } from './rail-region.entity';
import { RailWay } from './rail-way.entity';
import { StationLinkState } from './station-link-state.entity';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';
import { StationsWorker } from './stations.worker';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Place,
      StationLinkState,
      RailRegion,
      RailWay,
      RailLink,
    ]),
  ],
  controllers: [StationsController],
  providers: [StationsService, StationsWorker],
})
export class StationsModule {}

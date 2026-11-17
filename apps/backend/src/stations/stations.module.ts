import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityStationGain } from './activity-station-gain.entity';
import { Place } from './place.entity';
import { PlaceTile } from './place-tile.entity';
import { Station } from './station.entity';
import { RailLinkCountry } from './rail-link-country.entity';
import { RailLink } from './rail-link.entity';
import { RailSegment } from './rail-segment.entity';
import { RailStroke } from './rail-stroke.entity';
import { RailwayImport } from './railway-import.entity';
import { UserStationMetrics } from './user-station-metrics.entity';
import { StationMetricsService } from './station-metrics.service';
import { StationMetricsWorker } from './station-metrics.worker';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityStationGain,
      Place,
      PlaceTile,
      Station,
      RailLink,
      RailLinkCountry,
      RailSegment,
      RailStroke,
      RailwayImport,
      UserStationMetrics,
    ]),
  ],
  controllers: [StationsController],
  providers: [StationsService, StationMetricsService, StationMetricsWorker],
  exports: [StationsService, StationMetricsService],
})
export class StationsModule {}

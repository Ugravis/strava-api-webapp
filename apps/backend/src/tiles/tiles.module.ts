import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationsModule } from '../stations/stations.module';
import { StorageModule } from '../storage/storage.module';
import { ActivityGain } from './activity-gain.entity';
import { ActivityGainsService } from './activity-gains.service';
import { ActivityGainsWorker } from './activity-gains.worker';
import { ActivityTile } from './activity-tile.entity';
import { ActivityTileState } from './activity-tile-state.entity';
import { TileFirstVisit } from './tile-first-visit.entity';
import { MapPreviewService } from './map-preview.service';
import { TileHistoryService } from './tile-history.service';
import { TileMetricsWorker } from './tile-metrics.worker';
import { TilesController } from './tiles.controller';
import { TilesService } from './tiles.service';
import { UserTile } from './user-tile.entity';
import { UserTileMetrics } from './user-tile-metrics.entity';
import { UserTilesService } from './user-tiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityGain,
      ActivityTile,
      ActivityTileState,
      TileFirstVisit,
      UserTile,
      UserTileMetrics,
    ]),
    StorageModule,
    StationsModule,
  ],
  controllers: [TilesController],
  providers: [
    TilesService,
    UserTilesService,
    TileHistoryService,
    MapPreviewService,
    TileMetricsWorker,
    ActivityGainsService,
    ActivityGainsWorker,
  ],
  exports: [TilesService, MapPreviewService, UserTilesService],
})
export class TilesModule {}

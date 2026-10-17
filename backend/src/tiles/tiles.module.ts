import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTile } from './activity-tile.entity';
import { ActivityTileState } from './activity-tile-state.entity';
import { TileMetricsWorker } from './tile-metrics.worker';
import { TilesController } from './tiles.controller';
import { TilesService } from './tiles.service';
import { UserTile } from './user-tile.entity';
import { UserTileMetrics } from './user-tile-metrics.entity';
import { UserTilesService } from './user-tiles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActivityTile,
      ActivityTileState,
      UserTile,
      UserTileMetrics,
    ]),
  ],
  controllers: [TilesController],
  providers: [TilesService, UserTilesService, TileMetricsWorker],
  exports: [TilesService],
})
export class TilesModule {}

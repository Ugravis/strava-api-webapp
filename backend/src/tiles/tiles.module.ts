import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityTile } from './activity-tile.entity';
import { ActivityTileState } from './activity-tile-state.entity';
import { TilesController } from './tiles.controller';
import { TilesService } from './tiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityTile, ActivityTileState])],
  controllers: [TilesController],
  providers: [TilesService],
  exports: [TilesService],
})
export class TilesModule {}

import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { type TileSquare, tileMetrics, type TilePoint } from './tile-metrics';
import { TileParamsDto } from './tile-params.dto';
import { type TileStats, type TileVisits, TilesService } from './tiles.service';

/** Shapes drawn on the map for one level of tiles. */
export interface LevelAchievements {
  maxSquare: TileSquare | null;
  maxCluster: TilePoint[];
}

export interface TilesResponse {
  /** `[x, y, mask]`: a large tile (zoom 14) and its small tiles as an unsigned 64-bit decimal mask. */
  cells: [number, number, string][];
  tiles: LevelAchievements;
  subtiles: LevelAchievements;
}

@Controller('tiles')
export class TilesController {
  constructor(private readonly tiles: TilesService) {}

  /** Every tile crossed by the user, including the areas hidden to others. */
  @Get()
  async list(@CurrentUser() user: User): Promise<TilesResponse> {
    const cells = await this.tiles.cells(user.id);
    const { tiles, subtiles } = tileMetrics(cells);
    return {
      cells: cells.map(({ x, y, mask }) => [x, y, mask.toString()]),
      tiles: { maxSquare: tiles.maxSquare, maxCluster: tiles.maxCluster },
      subtiles: {
        maxSquare: subtiles.maxSquare,
        maxCluster: subtiles.maxCluster,
      },
    };
  }

  @Get('stats')
  stats(@CurrentUser() user: User): Promise<TileStats> {
    return this.tiles.stats(user.id);
  }

  /** Activities that crossed one tile. */
  @Get(':zoom/:x/:y')
  visits(
    @CurrentUser() user: User,
    @Param() { zoom, x, y }: TileParamsDto,
  ): Promise<TileVisits> {
    return this.tiles.visits(user.id, zoom, x, y);
  }
}

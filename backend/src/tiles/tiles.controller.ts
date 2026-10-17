import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import {
  subtilePoints,
  type TilePoint,
  type TileSquare,
  tilePoints,
} from './tile-metrics';
import { TileParamsDto } from './tile-params.dto';
import { type TileVisits, TilesService } from './tiles.service';
import {
  type TileDetails,
  type TilesSummary,
  UserTilesService,
} from './user-tiles.service';
import { VectorTileParamsDto } from './vector-tile-params.dto';

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

export interface LevelStats {
  /** Tiles crossed at least once. */
  visited: number;
  /** Side of the largest square of visited tiles. */
  maxSquare: number;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  /** Visited tiles whose four neighbors are visited too. */
  clustered: number;
}

export interface TileStats {
  /** Large tiles (zoom 14). */
  tiles: LevelStats;
  /** Small tiles (zoom 17). */
  subtiles: LevelStats;
}

/** A tile and the activities that crossed it. */
export interface TileVisitsResponse extends TileVisits {
  tile: TileDetails;
}

/** A view of the map loads a few dozen tiles at once. */
const VECTOR_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@Controller('tiles')
export class TilesController {
  constructor(
    private readonly tiles: TilesService,
    private readonly userTiles: UserTilesService,
  ) {}

  /**
   * Every tile crossed by the user, including the areas hidden to others.
   * Grows with the history: replaced by the summary and the vector tiles.
   */
  @Get()
  async list(@CurrentUser() user: User): Promise<TilesResponse> {
    const [cells, clusters, summary] = await Promise.all([
      this.userTiles.cells(user.id),
      this.userTiles.maxClusters(user.id),
      this.userTiles.summary(user.id),
    ]);
    return {
      cells: cells.map(({ x, y, mask }) => [x, y, mask.toString()]),
      tiles: {
        maxSquare: summary.tiles.maxSquare,
        maxCluster: tilePoints(clusters.tiles),
      },
      subtiles: {
        maxSquare: summary.subtiles.maxSquare,
        maxCluster: subtilePoints(clusters.subtiles),
      },
    };
  }

  /** Counters and achievements of the user, and the version of the tiles for the vector tiles. */
  @Get('summary')
  summary(@CurrentUser() user: User): Promise<TilesSummary> {
    return this.userTiles.summary(user.id);
  }

  @Get('stats')
  async stats(@CurrentUser() user: User): Promise<TileStats> {
    const { tiles, subtiles } = await this.userTiles.summary(user.id);
    const level = (metrics: TilesSummary['tiles']): LevelStats => ({
      ...metrics,
      maxSquare: metrics.maxSquare?.size ?? 0,
    });
    return { tiles: level(tiles), subtiles: level(subtiles) };
  }

  /**
   * Vector tile of the tiles of the user, including the areas hidden to
   * others: owner only. Requested with the version of the tiles from the
   * summary (`?v=`), only part of the URL: the browser caches the tiles of
   * each version.
   */
  @Get('vector/:zoom/:x/:y')
  @Throttle(VECTOR_THROTTLE)
  @Header('Content-Type', 'application/vnd.mapbox-vector-tile')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async vector(
    @CurrentUser() user: User,
    @Param() { zoom, x, y }: VectorTileParamsDto,
  ): Promise<StreamableFile> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    return new StreamableFile(
      await this.userTiles.vectorTile(user.id, zoom, x, y),
    );
  }

  /** Details of one tile and the activities that crossed it. */
  @Get(':zoom/:x/:y')
  async visits(
    @CurrentUser() user: User,
    @Param() { zoom, x, y }: TileParamsDto,
  ): Promise<TileVisitsResponse> {
    const [visits, tile] = await Promise.all([
      this.tiles.visits(user.id, zoom, x, y),
      this.userTiles.details(user.id, zoom, x, y),
    ]);
    return { ...visits, tile };
  }
}

import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import { TileParamsDto } from './tile-params.dto';
import { type TileVisits, TilesService } from './tiles.service';
import {
  type TileDetails,
  type TilesSummary,
  UserTilesService,
} from './user-tiles.service';
import type { Rgba } from './subtile-raster';
import {
  RasterTileParamsDto,
  RasterTileQueryDto,
  VectorTileParamsDto,
} from './vector-tile-params.dto';

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

/** `rrggbbaa`, validated by the DTO. */
function rgba(hex: string): Rgba {
  return [0, 2, 4, 6].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgba;
}

/** A view of the map loads a few dozen tiles at once. */
const VECTOR_THROTTLE = { default: { limit: 600, ttl: 60_000 } };
/** Twice as many images: the small tiles, and the other clusters of small tiles alone. */
const RASTER_THROTTLE = { default: { limit: 1200, ttl: 60_000 } };

@Controller('tiles')
export class TilesController {
  constructor(
    private readonly tiles: TilesService,
    private readonly userTiles: UserTilesService,
  ) {}

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
   * others: owner only. Revalidated by the browser from its entity tag,
   * which changes with the tiles it covers.
   */
  @Get('vector/:zoom/:x/:y')
  @Throttle(VECTOR_THROTTLE)
  async vector(
    @CurrentUser() user: User,
    @Param() { zoom, x, y }: VectorTileParamsDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendTile(user, zoom, x, y, request, response, {
      contentType: 'application/vnd.mapbox-vector-tile',
      render: () => this.userTiles.vectorTile(user.id, zoom, x, y),
    });
  }

  /**
   * PNG image of the small tiles of the user, including the areas hidden to
   * others: owner only. Revalidated like the vector tiles; the colors are
   * those of the map.
   */
  @Get('raster/:zoom/:x/:y')
  @Throttle(RASTER_THROTTLE)
  async raster(
    @CurrentUser() user: User,
    @Param() { zoom, x, y }: RasterTileParamsDto,
    @Query() { color, cluster, clusters }: RasterTileQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendTile(user, zoom, x, y, request, response, {
      contentType: 'image/png',
      render: () =>
        this.userTiles.rasterTile(
          user.id,
          zoom,
          x,
          y,
          rgba(color),
          rgba(cluster),
          clusters ? rgba(clusters) : null,
        ),
    });
  }

  /**
   * Sends a map tile, or `304 Not Modified` when the browser holds the
   * current one: only the map tiles whose tiles changed are rendered again.
   */
  private async sendTile(
    user: User,
    zoom: number,
    x: number,
    y: number,
    request: Request,
    response: Response,
    {
      contentType,
      render,
    }: { contentType: string; render: () => Promise<Buffer> },
  ): Promise<void> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    const tag = await this.userTiles.tileTag(user.id, zoom, x, y);
    response.set({ ETag: tag, 'Cache-Control': 'private, no-cache' });
    // Compares with the tag held by the browser, weak or not.
    if (request.fresh) {
      response.status(304).end();
      return;
    }
    response.type(contentType).send(await render());
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

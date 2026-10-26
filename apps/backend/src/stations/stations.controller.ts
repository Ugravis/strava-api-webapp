import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import { StationParamsDto, StationsTileParamsDto } from './station-params.dto';
import {
  type StationDetails,
  StationsService,
  type VisitedStations,
} from './stations.service';

/** A view of the map loads a few dozen tiles at once. */
const TILES_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@Controller('stations')
export class StationsController {
  constructor(private readonly stations: StationsService) {}

  /**
   * Stations visited by the user and the links between them. Computed from
   * every tile of the user, including the areas hidden to others: owner
   * only.
   */
  @Get()
  visited(@CurrentUser() user: User): Promise<VisitedStations> {
    return this.stations.visited(user.id);
  }

  /**
   * Vector tile of every station, visited or not. Geography only, cached by
   * the browser: the map requests it with the `stationsVersion` of the
   * visited stations, which changes with each import.
   */
  @Get('vector/:zoom/:x/:y')
  @Throttle(TILES_THROTTLE)
  @Header('Content-Type', 'application/vnd.mapbox-vector-tile')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async vector(
    @Param() { zoom, x, y }: StationsTileParamsDto,
  ): Promise<StreamableFile> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    return new StreamableFile(await this.stations.stationsTile(zoom, x, y));
  }

  /** A station, its first visit by the user, and its neighbors on the railway. */
  @Get(':id')
  async details(
    @CurrentUser() user: User,
    @Param() { id }: StationParamsDto,
  ): Promise<StationDetails> {
    const station = await this.stations.details(user.id, id);
    if (!station) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such station');
    }
    return station;
  }
}

import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import {
  type CountriesCompletion,
  CountriesService,
  type CountrySector,
} from './countries.service';
import { CountriesWorker } from './countries.worker';
import {
  CountryCodeParamsDto,
  SectorTileParamsDto,
  ShapesTileParamsDto,
  ShapesTileQueryDto,
} from './shapes-tile-params.dto';

/** A view of the map loads a few dozen tiles at once. */
const SHAPES_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@Controller('countries')
export class CountriesController {
  constructor(
    private readonly countries: CountriesService,
    private readonly worker: CountriesWorker,
  ) {}

  /**
   * Completion of the countries visited by the user. Computed from every
   * tile of the user, including the areas hidden to others: owner only.
   */
  @Get()
  completion(@CurrentUser() user: User): Promise<CountriesCompletion> {
    return this.countries.completion(user.id);
  }

  /**
   * Vector tile of the merged tile shapes of the given countries. Geography
   * only, cached by the browser: the map requests it with the countries the
   * user visited and the `shapesVersion` of the completion, which changes
   * with the shapes.
   */
  @Get('shapes/:zoom/:x/:y')
  @Throttle(SHAPES_THROTTLE)
  @Header('Content-Type', 'application/vnd.mapbox-vector-tile')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async shapes(
    @Param() { zoom, x, y }: ShapesTileParamsDto,
    @Query() { countries }: ShapesTileQueryDto,
  ): Promise<StreamableFile> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    const codes = countries ? countries.split(',') : [];
    return new StreamableFile(
      await this.countries.shapesTile(zoom, x, y, codes),
    );
  }

  /** Codes of every country, visited or not: the sectors offered by the map. */
  @Get('codes')
  @Header('Cache-Control', 'private, max-age=3600')
  codes(): Promise<string[]> {
    return this.countries.codes();
  }

  /**
   * A country as a sector of the map: the tiles of the user in it, its
   * totals, the first and latest visits of the user, and the bounds of its
   * main landmass. A country without totals is computed in the background.
   */
  @Get(':code/sector')
  async sector(
    @CurrentUser() user: User,
    @Param() { code }: CountryCodeParamsDto,
  ): Promise<CountrySector> {
    const sector = await this.countries.sector(user.id, code);
    if (!sector) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such country');
    }
    if (sector.shapeVersion === null) {
      this.worker.wake();
    }
    return sector;
  }

  /**
   * Vector tile of the area outside the tile shape of a country and of its
   * border, to dim the rest of the map. Geography only, cached by the
   * browser: the map requests it with the `shapeVersion` of the sector.
   */
  @Get(':code/outside/:zoom/:x/:y')
  @Throttle(SHAPES_THROTTLE)
  @Header('Content-Type', 'application/vnd.mapbox-vector-tile')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async outside(
    @Param() { code, zoom, x, y }: SectorTileParamsDto,
  ): Promise<StreamableFile> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    return new StreamableFile(
      await this.countries.sectorTile(zoom, x, y, code),
    );
  }
}

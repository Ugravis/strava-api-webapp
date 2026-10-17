import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import type { User } from '../users/user.entity';
import {
  type CountriesCompletion,
  CountriesService,
} from './countries.service';
import { ShapesTileParamsDto } from './shapes-tile-params.dto';

/** A view of the map loads a few dozen tiles at once. */
const SHAPES_THROTTLE = { default: { limit: 600, ttl: 60_000 } };

@Controller('countries')
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  /**
   * Completion of the countries visited by the user. Computed from every
   * tile of the user, including the areas hidden to others: owner only.
   */
  @Get()
  completion(@CurrentUser() user: User): Promise<CountriesCompletion> {
    return this.countries.completion(user.id);
  }

  /**
   * Vector tile of the tile shapes of the countries. Geography only: the
   * same for every user, cached by the browser. The map requests it with
   * the `shapesVersion` of the completion, which changes with the shapes.
   */
  @Get('shapes/:zoom/:x/:y')
  @Throttle(SHAPES_THROTTLE)
  @Header('Content-Type', 'application/vnd.mapbox-vector-tile')
  @Header('Cache-Control', 'private, max-age=31536000, immutable')
  async shapes(
    @Param() { zoom, x, y }: ShapesTileParamsDto,
  ): Promise<StreamableFile> {
    if (x >= 2 ** zoom || y >= 2 ** zoom) {
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
    }
    return new StreamableFile(await this.countries.shapesTile(zoom, x, y));
  }
}

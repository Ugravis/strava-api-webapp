import type {
  AdminMapRegion,
  AdminMapStation,
  AdminMapVersion,
} from '@kilotrace/shared/admin';
import {
  Get,
  Header,
  Param,
  ParseIntPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';
import {
  ADMIN_THROTTLE,
  AdminController,
} from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { AdminMapService } from './admin-map.service';

/** Zooms of the tiles: the railway from the furthest out, as the public map draws the visited one. */
const ZOOMS = { stations: { min: 0, max: 14 }, countries: { min: 0, max: 10 } };

function tileParams({ min, max }: { min: number; max: number }) {
  class TileParamsDto {
    @Type(() => Number)
    @IsInt()
    @Min(min)
    @Max(max)
    zoom!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(2 ** max - 1)
    x!: number;

    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(2 ** max - 1)
    y!: number;
  }
  return TileParamsDto;
}

class StationsTileParamsDto extends tileParams(ZOOMS.stations) {}
class CountriesTileParamsDto extends tileParams(ZOOMS.countries) {}

/** `?dots=all`: every station dot at every zoom, for the team to audit the ones thinned out. */
class StationsTileQueryDto {
  @IsOptional()
  @IsIn(['all'])
  dots?: string;
}

/** A view of the map loads a few dozen tiles at once, of two sources. */
const TILES_THROTTLE = { default: { ...ADMIN_THROTTLE, limit: 1200 } };
const MVT = 'application/vnd.mapbox-vector-tile';

/** The whole dataset of the map, for every member of the team to check it. */
@AdminController('map')
export class AdminMapController {
  constructor(private readonly map: AdminMapService) {}

  @Get('version')
  @AnyMember()
  version(): Promise<AdminMapVersion> {
    return this.map.version();
  }

  @Get('station/:id')
  @AnyMember()
  station(@Param('id', ParseIntPipe) id: number): Promise<AdminMapStation> {
    return this.map.station(id);
  }

  @Get('region/:code')
  @AnyMember()
  region(@Param('code') code: string): Promise<AdminMapRegion> {
    return this.map.region(code);
  }

  @Get('stations/:zoom/:x/:y')
  @AnyMember()
  @Throttle(TILES_THROTTLE)
  @Header('Content-Type', MVT)
  async stations(
    @Param() { zoom, x, y }: StationsTileParamsDto,
    @Query() { dots }: StationsTileQueryDto,
  ): Promise<StreamableFile> {
    assertTile(zoom, x, y);
    return new StreamableFile(
      await this.map.stationsTile(zoom, x, y, dots === 'all'),
    );
  }

  @Get('countries/:zoom/:x/:y')
  @AnyMember()
  @Throttle(TILES_THROTTLE)
  @Header('Content-Type', MVT)
  async countries(
    @Param() { zoom, x, y }: CountriesTileParamsDto,
  ): Promise<StreamableFile> {
    assertTile(zoom, x, y);
    return new StreamableFile(await this.map.countriesTile(zoom, x, y));
  }
}

function assertTile(zoom: number, x: number, y: number): void {
  if (x >= 2 ** zoom || y >= 2 ** zoom) {
    throw ApiErrors.notFound(ApiErrorCode.NotFound, 'No such tile');
  }
}

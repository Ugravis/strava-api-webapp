import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { RASTER_MIN_ZOOM, VECTOR_MAX_ZOOM } from './user-tiles.service';

export class VectorTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(VECTOR_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** VECTOR_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** VECTOR_MAX_ZOOM - 1)
  y!: number;
}

export class RasterTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(RASTER_MIN_ZOOM)
  @Max(VECTOR_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** VECTOR_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** VECTOR_MAX_ZOOM - 1)
  y!: number;
}

const RGBA_HEX = /^[0-9a-f]{8}$/i;

/** Colors of the image, chosen by the map, as `rrggbbaa`: the small tiles and those of the largest cluster. */
export class RasterTileQueryDto {
  @IsString()
  @Matches(RGBA_HEX)
  color!: string;

  @IsString()
  @Matches(RGBA_HEX)
  cluster!: string;
}

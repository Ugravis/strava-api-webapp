import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Deepest zoom of the shape tiles: the map stretches them beyond. At zoom
 * 10, a large tile still spans 64 units of the 4096 of a vector tile.
 */
export const SHAPES_MAX_ZOOM = 10;

export class ShapesTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(SHAPES_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** SHAPES_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** SHAPES_MAX_ZOOM - 1)
  y!: number;
}

/** Countries to merge, as sorted ISO codes (`CH,FR`), and the version of the shapes. */
export class ShapesTileQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^([A-Z]{2}(,[A-Z]{2}){0,299})?$/)
  countries?: string;

  /** Only part of the URL, so that the browser cache follows the shapes. */
  @IsOptional()
  @IsString()
  v?: string;
}

/** A point of the map, in degrees. */
export class PointQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  /** Within the latitudes of Web Mercator. */
  @Type(() => Number)
  @IsNumber()
  @Min(-85.06)
  @Max(85.06)
  lat!: number;
}

export class CountryCodeParamsDto {
  /** ISO 3166-1 alpha-2 code. */
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  code!: string;
}

/** A tile of the area outside a sector, with the code of its country. */
export class SectorTileParamsDto extends ShapesTileParamsDto {
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  code!: string;
}

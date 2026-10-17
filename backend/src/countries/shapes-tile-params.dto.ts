import { Type } from 'class-transformer';
import {
  IsInt,
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

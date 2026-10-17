import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

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

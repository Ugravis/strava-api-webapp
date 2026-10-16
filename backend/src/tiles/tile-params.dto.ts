import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { SUBTILE_ZOOM, TILE_ZOOM } from './tile-grid';

/** A large tile (zoom 14) or a small one (zoom 17). */
export class TileParamsDto {
  @Type(() => Number)
  @IsIn([TILE_ZOOM, SUBTILE_ZOOM])
  zoom!: typeof TILE_ZOOM | typeof SUBTILE_ZOOM;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** SUBTILE_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** SUBTILE_ZOOM - 1)
  y!: number;
}

import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { VECTOR_MAX_ZOOM } from './user-tiles.service';

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

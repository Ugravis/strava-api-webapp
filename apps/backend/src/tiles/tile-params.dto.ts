import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { SUBTILE_ZOOM, TILE_ZOOM } from './tile-grid';
import { TILE_ACTIVITIES_CURSOR } from './tile-activities-cursor';

/** Activities of a tile listed per page by default, and at most. */
const TILE_ACTIVITIES_DEFAULT_LIMIT = 5;
const TILE_ACTIVITIES_MAX_LIMIT = 50;

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

/** A page of the activities of a tile. */
export class TileActivitiesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TILE_ACTIVITIES_MAX_LIMIT)
  limit: number = TILE_ACTIVITIES_DEFAULT_LIMIT;

  /** `next` of the previous page. */
  @IsOptional()
  @IsString()
  @Matches(TILE_ACTIVITIES_CURSOR)
  cursor?: string;
}

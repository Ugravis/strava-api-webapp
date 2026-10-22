import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Below this zoom, the map shows no station: too many to tell apart. */
export const STATIONS_MIN_ZOOM = 6;
/** Deepest zoom of the station tiles: the map stretches them beyond. */
export const STATIONS_MAX_ZOOM = 14;

export class StationsTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(STATIONS_MIN_ZOOM)
  @Max(STATIONS_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** STATIONS_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** STATIONS_MAX_ZOOM - 1)
  y!: number;
}

/** Only part of the URL, so that the browser cache follows the imports of the stations. */
export class StationsTileQueryDto {
  @IsOptional()
  @IsString()
  v?: string;
}

export class StationParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;
}

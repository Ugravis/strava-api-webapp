import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PREVIEW_THEMES, type PreviewTheme } from './map-preview.service';
import { HISTORY_MODES, type HistoryMode } from './tile-history.service';
import { RASTER_MIN_ZOOM, TILES_MAX_ZOOM } from './user-tiles.service';

export class VectorTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(TILES_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** TILES_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** TILES_MAX_ZOOM - 1)
  y!: number;
}

export class RasterTileParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(RASTER_MIN_ZOOM)
  @Max(TILES_MAX_ZOOM)
  zoom!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** TILES_MAX_ZOOM - 1)
  x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2 ** TILES_MAX_ZOOM - 1)
  y!: number;
}

const RGBA_HEX = /^[0-9a-f]{8}$/i;

/**
 * Colors of the image, chosen by the map, as `rrggbbaa`: the small tiles,
 * those of the largest cluster, and those of the other clusters, drawn like
 * the others without it or zoomed out.
 */
export class RasterTileQueryDto {
  @IsString()
  @Matches(RGBA_HEX)
  color!: string;

  @IsString()
  @Matches(RGBA_HEX)
  cluster!: string;

  @IsOptional()
  @IsString()
  @Matches(RGBA_HEX)
  clusters?: string;
}

/** The history of the tiles at a date: the tiles gained since, or the map as it was then. */
export class TileHistoryQueryDto {
  @IsIn(HISTORY_MODES)
  mode!: HistoryMode;

  @Type(() => Date)
  @IsDate()
  date!: Date;
}

/** The history of the small tiles at a date, drawn in `color` (`rrggbbaa`). */
export class TileHistoryRasterQueryDto extends TileHistoryQueryDto {
  @IsString()
  @Matches(RGBA_HEX)
  color!: string;
}

/** The theme of the preview of the map, as the map. */
export class MapPreviewQueryDto {
  @IsIn(PREVIEW_THEMES)
  theme!: PreviewTheme;
}

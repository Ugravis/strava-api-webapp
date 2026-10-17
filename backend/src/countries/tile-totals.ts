import { SUBTILE_ZOOM, TILE_ZOOM } from '../tiles/tile-grid';

/** Tiles touching a country, on both levels. */
export interface TileTotals {
  /** Large tiles (zoom 14). */
  tiles: number;
  /** Small tiles (zoom 17). */
  subtiles: number;
}

/**
 * Adds one level of the quadtree descent over a country: `covered` tiles
 * of `zoom` lie entirely inside it and count with all their descendants,
 * `partial` ones cross its boundary and are split further. A partial tile
 * at the zoom of a level touches the country, so it counts as one tile.
 */
export function addLevel(
  totals: TileTotals,
  zoom: number,
  covered: number,
  partial: number,
): TileTotals {
  const descendants = (levelZoom: number) =>
    zoom <= levelZoom ? covered * 4 ** (levelZoom - zoom) : 0;
  return {
    tiles:
      totals.tiles +
      descendants(TILE_ZOOM) +
      (zoom === TILE_ZOOM ? partial : 0),
    subtiles:
      totals.subtiles +
      descendants(SUBTILE_ZOOM) +
      (zoom === SUBTILE_ZOOM ? partial : 0),
  };
}

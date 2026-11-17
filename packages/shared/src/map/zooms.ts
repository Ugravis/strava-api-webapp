/**
 * The zooms the backend and the maps must agree on: the grid of the tiles,
 * and the deepest zoom of each vector tile source the backend serves (the
 * maps stretch them beyond). Written once, so that both sides change together.
 */

/** Large tiles: slippy-map tiles at zoom 14, about 1.7 km wide in France. */
export const TILE_ZOOM = 14;
/** Small tiles: zoom 17, 8 × 8 = 64 per large tile, about 210 m wide in France. */
export const SUBTILE_ZOOM = 17;
/** Small tiles along a side of a large tile. */
export const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/**
 * Deepest zoom of the vector tiles and of the images of the visited tiles. At
 * zoom 12, a small tile still spans 128 units of the 4096 of a vector tile,
 * and 16 pixels of an image.
 */
export const TILES_MAX_ZOOM = 12;
/** Deepest zoom of the shape tiles. At zoom 10, a large tile still spans 64 units of the 4096 of a vector tile. */
export const SHAPES_MAX_ZOOM = 10;
/** Deepest zoom of the vector tiles of the stations. */
export const STATIONS_MAX_ZOOM = 14;

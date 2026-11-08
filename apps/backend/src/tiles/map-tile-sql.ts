import { SUBTILE_ZOOM, TILE_ZOOM } from './tile-grid';

/**
 * SQL shared by the map tiles of the user: vector tiles of areas of large
 * tiles, merged into rectangles, read over a range of large tiles.
 */

/**
 * Zoomed out, the large tiles are grouped by ancestor, at most at
 * `zoom + 9`, one pixel of a 512 pixels map tile: finer, the area would
 * look like a thin lace. Below zoom 6, the first grouping, at zoom 13, two
 * pixels at zoom 5, comes before it.
 */
const VECTOR_GROUPING_LEVELS = 9;
const FIRST_GROUPING_ZOOM = 6;

/** Level at which the large tiles of a map tile at `zoom` are grouped. */
export function groupingLevel(zoom: number): number {
  const ceiling = zoom < FIRST_GROUPING_ZOOM ? TILE_ZOOM - 1 : TILE_ZOOM;
  return Math.min(ceiling, zoom + VECTOR_GROUPING_LEVELS);
}
const MVT_EXTENT = 4096;
/** The outline of the visited area is served from this zoom, where the map draws it. */
export const VECTOR_OUTLINE_MIN_ZOOM = 10;
/** Margin of the vector tiles: the areas go beyond the tile, their outlines are not cut at its edges. */
const MVT_BUFFER = 64;
/** Half of the Web Mercator world, in meters. */
const WORLD_HALF_M = 20037508.342789244;
export const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/** Range of large tiles covered by the map tile `(zoom, x, y)`, extended by `margin` large tiles. */
export function tileRange(zoom: number, x: number, y: number, margin = 0) {
  const span = 2 ** (TILE_ZOOM - zoom);
  return {
    minX: x * span - margin,
    maxX: (x + 1) * span - 1 + margin,
    minY: y * span - margin,
    maxY: (y + 1) * span - 1 + margin,
  };
}

/** Large tiles read around a map tile, so that its areas reach its buffer. */
export function marginOf(zoom: number): number {
  const level = groupingLevel(zoom);
  const cellsPerSide = 2 ** (level - zoom);
  const margin = Math.ceil((cellsPerSide * MVT_BUFFER) / MVT_EXTENT) + 1;
  return margin << (TILE_ZOOM - level);
}

/**
 * Rectangles covering the cells of `source` (columns `x`, `y`, at `level`):
 * the contiguous cells of a row, then the identical runs of consecutive
 * rows. As geometries in Web Mercator.
 */
export function rectanglesSql(source: string, level: number): string {
  const size = (2 * WORLD_HALF_M) / 2 ** level;
  return `SELECT ST_MakeEnvelope(
      ${-WORLD_HALF_M} + x0 * ${size}, ${WORLD_HALF_M} - (y1 + 1) * ${size},
      ${-WORLD_HALF_M} + (x1 + 1) * ${size}, ${WORLD_HALF_M} - y0 * ${size}, 3857) AS geom
    FROM (
      SELECT x0, x1, min(y) AS y0, max(y) AS y1 FROM (
        SELECT x0, x1, y, y - row_number() OVER (PARTITION BY x0, x1 ORDER BY y) AS block
        FROM (
          SELECT y, min(x) AS x0, max(x) AS x1 FROM (
            SELECT x, y, x - row_number() OVER (PARTITION BY y ORDER BY x) AS run
            FROM ${source}
          ) cells GROUP BY y, run
        ) runs
      ) blocks GROUP BY x0, x1, block
    ) rectangles`;
}

/** One vector tile layer holding `geometry`, an expression over the CTE `bounds`; empty without it. */
export function layerSql(name: string, geometry: string): string {
  return `COALESCE((
    SELECT ST_AsMVT(features, '${name}', ${MVT_EXTENT}, 'geom') FROM (
      SELECT ST_AsMVTGeom(${geometry}, bounds.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
      FROM bounds
    ) features WHERE geom IS NOT NULL
  ), ''::bytea)`;
}

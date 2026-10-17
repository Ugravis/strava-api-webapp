import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  countSubtiles,
  fromSignedMask,
  SUBTILE_ZOOM,
  TILE_ZOOM,
} from './tile-grid';
import type { StoredLevelMetrics, StoredMetrics } from './tile-metrics';
import { encodePng, rasterIndices, type Rgba } from './subtile-raster';
import type { PackedCells, PackedMetrics } from './tile-metrics-packing';

/** Tiles of a user and their metrics, as stored. */
export interface TilesSummary {
  /** Changes whenever the tiles change: the vector tiles are cached until it does. */
  version: string;
  /** False while the metrics of the latest tiles are being computed: they are those of a previous version. */
  upToDate: boolean;
  /** Large tiles (zoom 14). */
  tiles: StoredLevelMetrics;
  /** Small tiles (zoom 17). */
  subtiles: StoredLevelMetrics;
}

/** What the map shows about one tile, at the level of its zoom. */
export interface TileDetails {
  visited: boolean;
  /** Small tiles explored inside a large tile; null for a small tile. */
  subtiles: number | null;
  /** Its four neighbors are visited too. */
  clustered: boolean;
  inMaxCluster: boolean;
  inMaxSquare: boolean;
}

/** A user whose metrics are behind their tiles. */
export interface StaleMetrics {
  userId: string;
  version: string;
}

const EMPTY_LEVEL: StoredLevelMetrics = {
  visited: 0,
  maxSquare: null,
  maxCluster: 0,
  clustered: 0,
};

/** Changes this recent are left to settle: an import saves many activities in a row. */
const SETTLE_DELAY = "interval '2 seconds'";
/** Metrics older than this are computed again even while the tiles keep changing. */
const MAX_METRICS_AGE = "interval '30 seconds'";

/**
 * Deepest zoom of the vector tiles and of the images: the map stretches
 * them beyond. At zoom 12, a small tile still spans 128 units of the 4096
 * of a vector tile, and 16 pixels of an image.
 */
export const TILES_MAX_ZOOM = 12;
/** The images of the small tiles are served from this zoom, where a country like France fits on a screen. */
export const RASTER_MIN_ZOOM = 5;
/**
 * Revision of the content of the tiles, part of their entity tags: the
 * browser keeps the tiles until it changes, so a change of their content
 * must increment it.
 */
const TILES_FORMAT = 3;
/**
 * Below zoom 4, the large tiles are grouped by ancestor at `zoom + 10`:
 * half a pixel of a 512 pixels map tile, one pixel of a high density
 * screen.
 */
const VECTOR_GROUPING_LEVELS = 10;
const MVT_EXTENT = 4096;
/** The outline of the visited area is served from this zoom, where the map draws it. */
const VECTOR_OUTLINE_MIN_ZOOM = 10;
/** Margin of the vector tiles: the areas go beyond the tile, their outlines are not cut at its edges. */
const MVT_BUFFER = 64;
/** Half of the Web Mercator world, in meters. */
const WORLD_HALF_M = 20037508.342789244;
const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/**
 * Layers of the vector tiles: the visited large tiles merged into one area,
 * its outline, the area of the largest cluster, and at the deepest zoom the
 * small tiles, only to pick them on the map.
 */
export const VECTOR_LAYERS = {
  tiles: 'tiles',
  tilesOutline: 'tiles_outline',
  tileCluster: 'tile_cluster',
  subtiles: 'subtiles',
} as const;

/** Range of large tiles covered by the map tile `(zoom, x, y)`, extended by `margin` large tiles. */
function tileRange(zoom: number, x: number, y: number, margin = 0) {
  const span = 2 ** (TILE_ZOOM - zoom);
  return {
    minX: x * span - margin,
    maxX: (x + 1) * span - 1 + margin,
    minY: y * span - margin,
    maxY: (y + 1) * span - 1 + margin,
  };
}

/**
 * Rectangles covering the cells of `source` (columns `x`, `y`, at `level`):
 * the contiguous cells of a row, then the identical runs of consecutive
 * rows. As geometries in Web Mercator.
 */
function rectanglesSql(source: string, level: number): string {
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
function layerSql(name: string, geometry: string): string {
  return `COALESCE((
    SELECT ST_AsMVT(features, '${name}', ${MVT_EXTENT}, 'geom') FROM (
      SELECT ST_AsMVTGeom(${geometry}, bounds.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
      FROM bounds
    ) features WHERE geom IS NOT NULL
  ), ''::bytea)`;
}

/**
 * Read side of the tiles: `user_tiles`, the union of the tiles of the
 * activities of each user, and the metrics computed from it in the
 * background by `TileMetricsWorker`.
 */
@Injectable()
export class UserTilesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async summary(userId: string): Promise<TilesSummary> {
    const [row]: {
      version: string;
      metrics: StoredMetrics | null;
      metrics_version: string | null;
    }[] = await this.dataSource.query(
      `SELECT version::text, metrics, metrics_version::text
       FROM user_tile_metrics WHERE user_id = $1`,
      [userId],
    );
    if (!row) {
      return {
        version: '0',
        upToDate: true,
        tiles: EMPTY_LEVEL,
        subtiles: EMPTY_LEVEL,
      };
    }
    return {
      version: row.version,
      upToDate: row.metrics_version === row.version,
      tiles: row.metrics?.tiles ?? EMPTY_LEVEL,
      subtiles: row.metrics?.subtiles ?? EMPTY_LEVEL,
    };
  }

  /**
   * Details of the tile `(x, y)` at `zoom`, a large tile (zoom 14) or a
   * small one (zoom 17), from the large tiles around it.
   */
  async details(
    userId: string,
    zoom: typeof TILE_ZOOM | typeof SUBTILE_ZOOM,
    x: number,
    y: number,
  ): Promise<TileDetails> {
    const shift = zoom - TILE_ZOOM;
    const rows: {
      x: number;
      y: number;
      mask: string;
      max_cluster_mask: string;
      in_max_cluster: boolean;
    }[] = await this.dataSource.query(
      `SELECT x, y, mask::text, max_cluster_mask::text, in_max_cluster FROM user_tiles
       WHERE user_id = $1 AND x BETWEEN $2 - 1 AND $2 + 1 AND y BETWEEN $3 - 1 AND $3 + 1`,
      [userId, x >> shift, y >> shift],
    );
    const byTile = new Map(rows.map((row) => [`${row.x}/${row.y}`, row]));
    const side = 2 ** shift;
    const bitOf = (tx: number, ty: number) =>
      1n << BigInt((ty % side) * side + (tx % side));
    const has = (mask: string | undefined, tx: number, ty: number) =>
      mask !== undefined &&
      (zoom === TILE_ZOOM || (fromSignedMask(mask) & bitOf(tx, ty)) !== 0n);
    const rowAt = (tx: number, ty: number) =>
      byTile.get(`${tx >> shift}/${ty >> shift}`);
    const visitedAt = (tx: number, ty: number) =>
      has(rowAt(tx, ty)?.mask, tx, ty);
    const own = rowAt(x, y);
    const visited = visitedAt(x, y);
    const { tiles, subtiles } = await this.summary(userId);
    const square = (zoom === TILE_ZOOM ? tiles : subtiles).maxSquare;
    return {
      visited,
      subtiles:
        zoom === TILE_ZOOM
          ? own
            ? countSubtiles(fromSignedMask(own.mask))
            : 0
          : null,
      clustered:
        visited &&
        visitedAt(x + 1, y) &&
        visitedAt(x - 1, y) &&
        visitedAt(x, y + 1) &&
        visitedAt(x, y - 1),
      inMaxCluster:
        zoom === TILE_ZOOM
          ? (own?.in_max_cluster ?? false)
          : has(own?.max_cluster_mask, x, y),
      inMaxSquare:
        square !== null &&
        x >= square.x &&
        x < square.x + square.size &&
        y >= square.y &&
        y < square.y + square.size,
    };
  }

  /** The user whose metrics have waited the longest, once their tiles have settled. */
  async nextStale(): Promise<StaleMetrics | null> {
    const [row]: { user_id: string; version: string }[] =
      await this.dataSource.query(
        `SELECT user_id, version::text FROM user_tile_metrics
         WHERE metrics_version IS DISTINCT FROM version
           AND (changed_at <= now() - ${SETTLE_DELAY}
             OR computed_at IS NULL
             OR computed_at <= now() - ${MAX_METRICS_AGE})
         ORDER BY changed_at
         LIMIT 1`,
      );
    return row ? { userId: row.user_id, version: row.version } : null;
  }

  async packedCells(userId: string): Promise<PackedCells> {
    const rows: { x: number; y: number; mask: string }[] =
      await this.dataSource.query(
        'SELECT x, y, mask::text FROM user_tiles WHERE user_id = $1',
        [userId],
      );
    return {
      xs: Int32Array.from(rows, (row) => row.x),
      ys: Int32Array.from(rows, (row) => row.y),
      masks: BigInt64Array.from(rows, (row) => BigInt(row.mask)),
    };
  }

  /**
   * Stores the metrics computed from the tiles at `version`, and marks the
   * tiles of the largest clusters. Only the rows whose marks change are
   * written, with a new change value: the other map tiles stay valid.
   */
  saveMetrics(
    { userId, version }: StaleMetrics,
    { metrics, tileCluster, subtileCluster }: PackedMetrics,
  ): Promise<void> {
    const marks = new Map<
      string,
      { x: number; y: number; inCluster: boolean; mask: string }
    >();
    const markAt = (x: number, y: number) => {
      const key = `${x}/${y}`;
      let mark = marks.get(key);
      if (!mark) {
        mark = { x, y, inCluster: false, mask: '0' };
        marks.set(key, mark);
      }
      return mark;
    };
    tileCluster.xs.forEach((x, i) => {
      markAt(x, tileCluster.ys[i]).inCluster = true;
    });
    subtileCluster.xs.forEach((x, i) => {
      markAt(x, subtileCluster.ys[i]).mask = subtileCluster.masks[i].toString();
    });
    const rows = [...marks.values()];
    return this.dataSource.transaction(async (manager) => {
      // The change values of a user are taken under the same lock as the
      // trigger refreshing its tiles.
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended('user_tiles ' || $1, 0))`,
        [userId],
      );
      await manager.query(
        `WITH marks AS (
           SELECT * FROM unnest($2::integer[], $3::integer[], $4::boolean[], $5::bigint[])
             AS m(x, y, in_cluster, mask)
         ),
         change AS (SELECT nextval('user_tiles_change_seq') AS seq)
         UPDATE user_tiles u
         SET in_max_cluster = COALESCE(m.in_cluster, false),
           max_cluster_mask = COALESCE(m.mask, 0),
           changed_seq = change.seq
         FROM user_tiles t
         LEFT JOIN marks m ON m.x = t.x AND m.y = t.y
         CROSS JOIN change
         WHERE u.user_id = $1 AND t.user_id = $1 AND u.x = t.x AND u.y = t.y
           AND (t.in_max_cluster OR t.max_cluster_mask <> 0 OR m.x IS NOT NULL)
           AND (t.in_max_cluster, t.max_cluster_mask)
             IS DISTINCT FROM (COALESCE(m.in_cluster, false), COALESCE(m.mask, 0))`,
        [
          userId,
          rows.map((row) => row.x),
          rows.map((row) => row.y),
          rows.map((row) => row.inCluster),
          rows.map((row) => row.mask),
        ],
      );
      await manager.query(
        `UPDATE user_tile_metrics
         SET metrics = $2, metrics_version = $3, computed_at = now()
         WHERE user_id = $1`,
        [userId, metrics, version],
      );
    });
  }

  /**
   * Entity tag of the map tile `(zoom, x, y)` of the user, given with its
   * vector tile and its image: it changes with the rows of the large tiles
   * it covers, so that a new activity only invalidates the map tiles it
   * crossed.
   */
  async tileTag(
    userId: string,
    zoom: number,
    x: number,
    y: number,
  ): Promise<string> {
    const { minX, maxX, minY, maxY } = tileRange(
      zoom,
      x,
      y,
      this.marginOf(zoom),
    );
    const [row]: { count: number; seq: string }[] = await this.dataSource.query(
      `SELECT count(*)::int AS count, COALESCE(max(changed_seq), 0)::text AS seq
       FROM user_tiles
       WHERE user_id = $1 AND x BETWEEN $2 AND $3 AND y BETWEEN $4 AND $5`,
      [userId, minX, maxX, minY, maxY],
    );
    return `"${TILES_FORMAT}-${row.count}-${row.seq}"`;
  }

  /** Large tiles read around a map tile, so that its areas reach its buffer. */
  private marginOf(zoom: number): number {
    const level = Math.min(TILE_ZOOM, zoom + VECTOR_GROUPING_LEVELS);
    const cellsPerSide = 2 ** (level - zoom);
    const margin = Math.ceil((cellsPerSide * MVT_BUFFER) / MVT_EXTENT) + 1;
    return margin << (TILE_ZOOM - level);
  }

  /**
   * Vector tile (Mapbox Vector Tile) of the tiles of the user within the
   * map tile `(zoom, x, y)`: one area per layer, its tiles merged, so that
   * its size follows the outline of the tiles rather than their number.
   * Below zoom 4, the large tiles are grouped by ancestor at `zoom + 10`,
   * about one pixel wide.
   */
  async vectorTile(
    userId: string,
    zoom: number,
    x: number,
    y: number,
  ): Promise<Buffer> {
    const level = Math.min(TILE_ZOOM, zoom + VECTOR_GROUPING_LEVELS);
    const shift = TILE_ZOOM - level;
    const { minX, maxX, minY, maxY } = tileRange(
      zoom,
      x,
      y,
      this.marginOf(zoom),
    );
    const withSubtiles = zoom === TILES_MAX_ZOOM;
    const own = tileRange(zoom, x, y);
    const [row]: { tile: Buffer }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($2, $3, $4) AS envelope),
       cells AS MATERIALIZED (
         SELECT x, y, mask, in_max_cluster FROM user_tiles
         WHERE user_id = $1 AND x BETWEEN $5 AND $6 AND y BETWEEN $7 AND $8
       ),
       grouped AS MATERIALIZED (
         SELECT x >> ${shift} AS x, y >> ${shift} AS y, bool_or(in_max_cluster) AS cluster
         FROM cells GROUP BY 1, 2
       ),
       visited AS (
         SELECT ST_Union(geom) AS geom FROM (${rectanglesSql('grouped', level)}) r
       ),
       cluster AS (
         SELECT ST_Union(geom) AS geom
         FROM (${rectanglesSql('(SELECT x, y FROM grouped WHERE cluster) c', level)}) r
       ),
       subtiles AS (
         SELECT ST_Collect(geom) AS geom FROM (${rectanglesSql(
           `(SELECT c.x * ${SUBTILES_PER_SIDE} + i % ${SUBTILES_PER_SIDE} AS x,
               c.y * ${SUBTILES_PER_SIDE} + i / ${SUBTILES_PER_SIDE} AS y
             FROM cells c, generate_series(0, 63) AS i
             WHERE ${withSubtiles} AND (c.mask >> i) & 1 = 1
               AND c.x BETWEEN ${own.minX} AND ${own.maxX}
               AND c.y BETWEEN ${own.minY} AND ${own.maxY}) s`,
           SUBTILE_ZOOM,
         )}) r
       )
       SELECT ${layerSql(VECTOR_LAYERS.tiles, '(SELECT geom FROM visited)')}
         || ${zoom >= VECTOR_OUTLINE_MIN_ZOOM ? layerSql(VECTOR_LAYERS.tilesOutline, '(SELECT ST_Boundary(geom) FROM visited)') : "''::bytea"}
         || ${layerSql(VECTOR_LAYERS.tileCluster, '(SELECT geom FROM cluster)')}
         || ${layerSql(VECTOR_LAYERS.subtiles, '(SELECT geom FROM subtiles)')} AS tile`,
      [userId, zoom, x, y, minX, maxX, minY, maxY],
    );
    return row.tile;
  }

  /**
   * PNG image of the small tiles of the user within the map tile
   * `(zoom, x, y)`, in `subtileColor`, those of the largest cluster in
   * `clusterColor`. Its size stays bounded whatever the density of the
   * tiles, unlike the vector tiles.
   */
  async rasterTile(
    userId: string,
    zoom: number,
    x: number,
    y: number,
    subtileColor: Rgba,
    clusterColor: Rgba,
  ): Promise<Buffer> {
    const span = 2 ** (TILE_ZOOM - zoom);
    const rows: { x: number; y: number; mask: string; cluster: string }[] =
      await this.dataSource.query(
        `SELECT x, y, mask::text, max_cluster_mask::text AS cluster FROM user_tiles
         WHERE user_id = $1
           AND x BETWEEN $2 * ${span} AND ($2 + 1) * ${span} - 1
           AND y BETWEEN $3 * ${span} AND ($3 + 1) * ${span} - 1`,
        [userId, x, y],
      );
    const cells = rows.map((row) => ({
      x: row.x,
      y: row.y,
      mask: fromSignedMask(row.mask),
      clusterMask: fromSignedMask(row.cluster),
    }));
    return encodePng(rasterIndices(cells, zoom, x, y), [
      subtileColor,
      clusterColor,
    ]);
  }
}

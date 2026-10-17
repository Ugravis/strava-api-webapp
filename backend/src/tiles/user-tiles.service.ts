import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  countSubtiles,
  fromSignedMask,
  SUBTILE_ZOOM,
  TILE_ZOOM,
  type TileCell,
} from './tile-grid';
import type { StoredLevelMetrics, StoredMetrics } from './tile-metrics';
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

/** Deepest zoom of the vector tiles: the map stretches them beyond. */
export const VECTOR_MAX_ZOOM = TILE_ZOOM;
/** The small tiles are only served from this zoom, where they span a few pixels. */
export const VECTOR_SUBTILE_MIN_ZOOM = 12;
/**
 * From this zoom, each large tile is a feature of its own; below, the
 * contiguous tiles of a row are merged, which keeps the tiles small.
 */
const VECTOR_SINGLE_TILE_MIN_ZOOM = 10;
/** Below zoom 6, the large tiles are grouped by ancestor, about one pixel wide. */
const VECTOR_GROUPING_LEVELS = 8;
const MVT_EXTENT = 4096;
/** Half of the Web Mercator world, in meters. */
const WORLD_HALF_M = 20037508.342789244;
const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/**
 * Layers of the vector tiles: the visited large tiles, the large tiles of
 * the largest cluster, and from `VECTOR_SUBTILE_MIN_ZOOM` the same for the
 * small tiles.
 */
export const VECTOR_LAYERS = {
  tiles: 'tiles',
  tileCluster: 'tile_cluster',
  subtiles: 'subtiles',
  subtileCluster: 'subtile_cluster',
} as const;

/**
 * Features of one vector tile layer: the cells of `source` (columns `x`,
 * `y`, at `level`), each one alone or merged with the next ones of its row.
 */
function layerSql(
  name: string,
  source: string,
  level: number,
  merge: boolean,
): string {
  const size = (2 * WORLD_HALF_M) / 2 ** level;
  const runs = merge
    ? `SELECT y, min(x) AS x0, max(x) AS x1 FROM (
         SELECT x, y, x - row_number() OVER (PARTITION BY y ORDER BY x) AS run
         FROM ${source}
       ) cells GROUP BY y, run`
    : `SELECT y, x AS x0, x AS x1 FROM ${source}`;
  return `COALESCE((
    SELECT ST_AsMVT(features, '${name}', ${MVT_EXTENT}, 'geom') FROM (
      SELECT ST_AsMVTGeom(
        ST_MakeEnvelope(
          ${-WORLD_HALF_M} + x0 * ${size}, ${WORLD_HALF_M} - (y + 1) * ${size},
          ${-WORLD_HALF_M} + (x1 + 1) * ${size}, ${WORLD_HALF_M} - y * ${size}, 3857),
        bounds.envelope, ${MVT_EXTENT}, 0, true) AS geom
      FROM (${runs}) runs, bounds
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

  /** Every large tile crossed by the user, with its small tiles. */
  async cells(userId: string): Promise<TileCell[]> {
    const rows: { x: number; y: number; mask: string }[] =
      await this.dataSource.query(
        'SELECT x, y, mask::text FROM user_tiles WHERE user_id = $1',
        [userId],
      );
    return rows.map(({ x, y, mask }) => ({ x, y, mask: fromSignedMask(mask) }));
  }

  /** Large tiles of the largest cluster, and small tiles of the largest cluster grouped by large tile. */
  async maxClusters(
    userId: string,
  ): Promise<{ tiles: TileCell[]; subtiles: TileCell[] }> {
    const rows: {
      x: number;
      y: number;
      in_max_cluster: boolean;
      max_cluster_mask: string;
    }[] = await this.dataSource.query(
      `SELECT x, y, in_max_cluster, max_cluster_mask::text FROM user_tiles
       WHERE user_id = $1 AND (in_max_cluster OR max_cluster_mask <> 0)`,
      [userId],
    );
    return {
      tiles: rows
        .filter((row) => row.in_max_cluster)
        .map(({ x, y }) => ({ x, y, mask: -1n })),
      subtiles: rows
        .filter((row) => row.max_cluster_mask !== '0')
        .map(({ x, y, max_cluster_mask }) => ({
          x,
          y,
          mask: fromSignedMask(max_cluster_mask),
        })),
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

  /** Stores the metrics computed from the tiles at `version`, and marks the tiles of the largest clusters. */
  saveMetrics(
    { userId, version }: StaleMetrics,
    { metrics, tileCluster, subtileCluster }: PackedMetrics,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE user_tiles SET in_max_cluster = false, max_cluster_mask = 0
         WHERE user_id = $1 AND (in_max_cluster OR max_cluster_mask <> 0)`,
        [userId],
      );
      await manager.query(
        `UPDATE user_tiles u SET in_max_cluster = true
         FROM unnest($2::integer[], $3::integer[]) AS c(x, y)
         WHERE u.user_id = $1 AND u.x = c.x AND u.y = c.y`,
        [userId, [...tileCluster.xs], [...tileCluster.ys]],
      );
      await manager.query(
        `UPDATE user_tiles u SET max_cluster_mask = c.mask
         FROM unnest($2::integer[], $3::integer[], $4::bigint[]) AS c(x, y, mask)
         WHERE u.user_id = $1 AND u.x = c.x AND u.y = c.y`,
        [
          userId,
          [...subtileCluster.xs],
          [...subtileCluster.ys],
          Array.from(subtileCluster.masks, (mask) => mask.toString()),
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
   * Vector tile (Mapbox Vector Tile) of the tiles of the user within the
   * map tile `(zoom, x, y)`. Below zoom 6, the large tiles are grouped by
   * ancestor at `zoom + 8`, about one pixel wide.
   */
  async vectorTile(
    userId: string,
    zoom: number,
    x: number,
    y: number,
  ): Promise<Buffer> {
    const span = 2 ** (TILE_ZOOM - zoom);
    const level = Math.min(TILE_ZOOM, zoom + VECTOR_GROUPING_LEVELS);
    const shift = TILE_ZOOM - level;
    const merge = zoom < VECTOR_SINGLE_TILE_MIN_ZOOM;
    const withSubtiles = zoom >= VECTOR_SUBTILE_MIN_ZOOM;
    const expand = (maskColumn: string) =>
      `SELECT c.x * ${SUBTILES_PER_SIDE} + i % ${SUBTILES_PER_SIDE} AS x,
         c.y * ${SUBTILES_PER_SIDE} + i / ${SUBTILES_PER_SIDE} AS y
       FROM cells c, generate_series(0, 63) AS i
       WHERE (c.${maskColumn} >> i) & 1 = 1`;
    const layers = [
      layerSql(VECTOR_LAYERS.tiles, 'grouped', level, merge),
      layerSql(
        VECTOR_LAYERS.tileCluster,
        '(SELECT x, y FROM grouped WHERE cluster) cluster',
        level,
        merge,
      ),
      ...(withSubtiles
        ? [
            layerSql(VECTOR_LAYERS.subtiles, 'subtiles', SUBTILE_ZOOM, false),
            layerSql(
              VECTOR_LAYERS.subtileCluster,
              'subtile_cluster',
              SUBTILE_ZOOM,
              false,
            ),
          ]
        : []),
    ];
    const [row]: { tile: Buffer }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($2, $3, $4) AS envelope),
       cells AS MATERIALIZED (
         SELECT x, y, mask, max_cluster_mask, in_max_cluster FROM user_tiles
         WHERE user_id = $1
           AND x BETWEEN $3 * ${span} AND ($3 + 1) * ${span} - 1
           AND y BETWEEN $4 * ${span} AND ($4 + 1) * ${span} - 1
       ),
       grouped AS MATERIALIZED (
         SELECT x >> ${shift} AS x, y >> ${shift} AS y, bool_or(in_max_cluster) AS cluster
         FROM cells GROUP BY 1, 2
       ),
       subtiles AS (${withSubtiles ? expand('mask') : 'SELECT 0 AS x, 0 AS y WHERE false'}),
       subtile_cluster AS (${withSubtiles ? expand('max_cluster_mask') : 'SELECT 0 AS x, 0 AS y WHERE false'})
       SELECT ${layers.join(' || ')} AS tile`,
      [userId, zoom, x, y],
    );
    return row.tile;
  }
}

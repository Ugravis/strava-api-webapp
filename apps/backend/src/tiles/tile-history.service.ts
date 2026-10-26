import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  groupingLevel,
  layerSql,
  marginOf,
  rectanglesSql,
  tileRange,
  VECTOR_OUTLINE_MIN_ZOOM,
} from './map-tile-sql';
import { StationsService } from '../stations/stations.service';
import { encodePng, rasterIndices, type Rgba } from './subtile-raster';
import { fromSignedMask, TILE_ZOOM } from './tile-grid';

/**
 * Which tiles the history shows: those first visited since the date, or
 * those visited before it, the map as it was then.
 */
export type HistoryMode = 'gained' | 'state';

export const HISTORY_MODES: readonly HistoryMode[] = ['gained', 'state'];

/** Tiles of the history at a date, and the version they were replayed from. */
export interface TileHistorySummary {
  /**
   * Version of the tiles whose first visits are stored: the map tiles of
   * the history change with it. Null until the first replay.
   */
  version: string | null;
  /** False while the first visits of the latest tiles are being replayed. */
  upToDate: boolean;
  /** Start of the first activity that crossed a tile; null without tiles. */
  firstVisitAt: string | null;
  /** Large tiles (zoom 14) of the history. */
  tiles: number;
  /** Small tiles (zoom 17) of the history. */
  subtiles: number;
  /** Train stations of the history. */
  stations: number;
  /** Meters of railway unlocked between the stations of the history. */
  railwayM: number;
}

/** Layers of the vector tiles of the history: the large tiles merged into one area, and its outline. */
export const HISTORY_VECTOR_LAYERS = {
  tiles: 'tiles',
  tilesOutline: 'tiles_outline',
} as const;

/**
 * Revision of the content of the map tiles of the history, part of their
 * entity tags: a change of their content must increment it.
 */
const HISTORY_FORMAT = 1;

/** Comparison of the first visits with the date, in parameter `$index`. */
function visitedSql(mode: HistoryMode, column: string, index: number): string {
  return `${column} ${mode === 'gained' ? '>=' : '<'} $${index}`;
}

/**
 * History of the tiles of a user, from `tile_first_visits`: the tiles first
 * visited since a date, or the map as it was at that date. A large tile was
 * first visited at the earliest first visit of its small tiles.
 */
/** What the activities of one day brought to the tiles. */
export interface TileTimelineDay {
  /** UTC date of the activities, `YYYY-MM-DD`. */
  date: string;
  tiles: number;
  subtiles: number;
  /** Growth of the side of the largest squares. */
  maxSquareTiles: number;
  maxSquareSubtiles: number;
  /** Growth of the largest clusters. */
  maxClusterTiles: number;
  maxClusterSubtiles: number;
}

@Injectable()
export class TileHistoryService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stations: StationsService,
  ) {}

  /**
   * Gains of the tiles day by day, oldest first, over every activity: their
   * running sums give the counters and achievements at any date.
   */
  timeline(userId: string): Promise<TileTimelineDay[]> {
    return this.dataSource.query(
      `SELECT to_char(a.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
         sum(cardinality(g.gained_tiles) / 2)::int AS tiles,
         sum(cardinality(g.gained_subtiles) / 2)::int AS subtiles,
         sum(g.max_square_tiles)::int AS "maxSquareTiles",
         sum(g.max_square_subtiles)::int AS "maxSquareSubtiles",
         sum(g.max_cluster_tiles)::int AS "maxClusterTiles",
         sum(g.max_cluster_subtiles)::int AS "maxClusterSubtiles"
       FROM activity_gains g JOIN activities a ON a.id = g.activity_id
       WHERE g.user_id = $1
       GROUP BY 1
       HAVING sum(cardinality(g.gained_tiles) + cardinality(g.gained_subtiles)
         + g.max_square_tiles + g.max_square_subtiles
         + g.max_cluster_tiles + g.max_cluster_subtiles) > 0
       ORDER BY 1`,
      [userId],
    );
  }

  async summary(
    userId: string,
    mode: HistoryMode,
    date: Date,
  ): Promise<TileHistorySummary> {
    const versionsQuery: Promise<
      { version: string; gains_version: string | null }[]
    > = this.dataSource.query(
      `SELECT version::text, gains_version::text FROM user_tile_metrics WHERE user_id = $1`,
      [userId],
    );
    const countsQuery: Promise<
      { tiles: number; subtiles: number; first_visit_at: Date | null }[]
    > = this.dataSource.query(
      `SELECT
         (SELECT count(*)::int FROM (
            SELECT 1 FROM tile_first_visits WHERE user_id = $1
            GROUP BY x, y HAVING ${visitedSql(mode, 'min(visited_at)', 2)}
         ) t) AS tiles,
         (SELECT COALESCE(sum(bit_count(mask::bit(64))), 0)::int FROM tile_first_visits
          WHERE user_id = $1 AND ${visitedSql(mode, 'visited_at', 2)}) AS subtiles,
         (SELECT min(visited_at) FROM tile_first_visits WHERE user_id = $1) AS first_visit_at`,
      [userId, date],
    );
    const [[versions], [counts], stations] = await Promise.all([
      versionsQuery,
      countsQuery,
      this.stations.historyTotals(userId, mode === 'gained', date),
    ]);
    return {
      version: versions?.gains_version ?? null,
      upToDate: !versions || versions.gains_version === versions.version,
      firstVisitAt: counts.first_visit_at?.toISOString() ?? null,
      tiles: counts.tiles,
      subtiles: counts.subtiles,
      stations: stations.stations,
      railwayM: stations.railwayM,
    };
  }

  /**
   * Entity tag of the map tiles of the history: they change whenever the
   * first visits are replayed. The date and the mode are part of their
   * address.
   */
  async tileTag(userId: string): Promise<string> {
    const [row]: { version: string | null }[] = await this.dataSource.query(
      `SELECT gains_version::text AS version FROM user_tile_metrics WHERE user_id = $1`,
      [userId],
    );
    return `"history-${HISTORY_FORMAT}-${row?.version ?? 0}"`;
  }

  /**
   * Vector tile of the large tiles of the history within the map tile
   * `(zoom, x, y)`: one area and its outline, grouped by ancestor zoomed
   * out, like the vector tiles of all the tiles.
   */
  async vectorTile(
    userId: string,
    mode: HistoryMode,
    date: Date,
    zoom: number,
    x: number,
    y: number,
  ): Promise<Buffer> {
    const level = groupingLevel(zoom);
    const shift = TILE_ZOOM - level;
    const { minX, maxX, minY, maxY } = tileRange(zoom, x, y, marginOf(zoom));
    const [row]: { tile: Buffer }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($2, $3, $4) AS envelope),
       grouped AS MATERIALIZED (
         SELECT DISTINCT x >> ${shift} AS x, y >> ${shift} AS y FROM (
           SELECT x, y FROM tile_first_visits
           WHERE user_id = $1 AND x BETWEEN $5 AND $6 AND y BETWEEN $7 AND $8
           GROUP BY x, y HAVING ${visitedSql(mode, 'min(visited_at)', 9)}
         ) cells
       ),
       visited AS (
         SELECT ST_Union(geom) AS geom FROM (${rectanglesSql('grouped', level)}) r
       )
       SELECT ${layerSql(HISTORY_VECTOR_LAYERS.tiles, '(SELECT geom FROM visited)')}
         || ${zoom >= VECTOR_OUTLINE_MIN_ZOOM ? layerSql(HISTORY_VECTOR_LAYERS.tilesOutline, '(SELECT ST_Boundary(geom) FROM visited)') : "''::bytea"} AS tile`,
      [userId, zoom, x, y, minX, maxX, minY, maxY, date],
    );
    return row.tile;
  }

  /** PNG image of the small tiles of the history within the map tile `(zoom, x, y)`, in `color`. */
  async rasterTile(
    userId: string,
    mode: HistoryMode,
    date: Date,
    zoom: number,
    x: number,
    y: number,
    color: Rgba,
  ): Promise<Buffer> {
    const span = 2 ** (TILE_ZOOM - zoom);
    const rows: { x: number; y: number; mask: string }[] =
      await this.dataSource.query(
        `SELECT x, y, bit_or(mask)::text AS mask FROM tile_first_visits
         WHERE user_id = $1
           AND x BETWEEN $2 * ${span} AND ($2 + 1) * ${span} - 1
           AND y BETWEEN $3 * ${span} AND ($3 + 1) * ${span} - 1
           AND ${visitedSql(mode, 'visited_at', 4)}
         GROUP BY x, y`,
        [userId, x, y, date],
      );
    const cells = rows.map((row) => ({
      x: row.x,
      y: row.y,
      mask: fromSignedMask(row.mask),
      clusterMask: 0n,
      maxClusterMask: 0n,
    }));
    return encodePng(rasterIndices(cells, zoom, x, y), [color, color, color]);
  }
}

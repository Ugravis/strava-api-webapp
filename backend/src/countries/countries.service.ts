import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../tiles/tile-grid';
import { addLevel, type TileTotals } from './tile-totals';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

export interface LevelCompletion {
  visited: number;
  /** Tiles touching the country; null while being computed. */
  total: number | null;
}

/** Completion of a country visited by the user. */
export interface CountryCompletion {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: LevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: LevelCompletion;
}

export interface CountriesCompletion {
  countries: CountryCompletion[];
  /** Visited large tiles whose countries are not known yet. */
  pendingTiles: number;
  /**
   * Changes whenever the tile shape of a country is computed: the vector
   * tiles of the shapes can be cached until it changes. Null without shapes.
   */
  shapesVersion: string | null;
}

/** Large tiles of the user, with their small tiles. */
const USER_CELLS = `
  SELECT x, y, bit_or(mask) AS mask FROM activity_tiles
  WHERE user_id = $1
  GROUP BY x, y
  HAVING bit_or(mask) <> 0`;

/** Layers of the shape tiles: the merged areas and their outer borders. */
const SHAPES_AREA_LAYER = 'visited';
const SHAPES_BORDER_LAYER = 'borders';
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;
/** Snapping grid of the tile shapes, in meters: tile edges computed at different zooms meet exactly. */
const SHAPE_GRID_M = 1;

/**
 * Countries touched by the tiles. A tile belongs to every country it
 * touches, even marginally, so a tile crossed by a border counts for each
 * country.
 */
@Injectable()
export class CountriesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async hasCountries(): Promise<boolean> {
    const [row]: { exists: boolean }[] = await this.dataSource.query(
      'SELECT EXISTS (SELECT 1 FROM countries) AS exists',
    );
    return row.exists;
  }

  /** Current time of the database, the clock of `activity_tile_states.updated_at`. */
  async databaseNow(): Promise<Date> {
    const [row]: { now: Date }[] = await this.dataSource.query(
      'SELECT now() AS now',
    );
    return row.now;
  }

  /**
   * Locates up to `limit` visited large tiles not located yet: for each
   * country they touch, the mask of their small tiles touching it. A tile
   * inside a part of a country gets every small tile without testing them.
   * With `since`, only the tiles of the activities whose tiles were saved
   * since then are considered, instead of every tile. Returns the number
   * of tiles located.
   */
  async locateTiles(limit: number, since: Date | null): Promise<number> {
    const recent = since
      ? `JOIN activity_tile_states s
           ON s.activity_id = t.activity_id AND s.updated_at >= $2`
      : '';
    return this.dataSource.transaction(async (manager) => {
      const [row]: { located: number }[] = await manager.query(
        `WITH todo AS (
           SELECT DISTINCT t.x, t.y FROM activity_tiles t
           ${recent}
           WHERE NOT EXISTS (
             SELECT 1 FROM located_tiles l WHERE l.x = t.x AND l.y = t.y
           )
           LIMIT $1
         ),
         marked AS (
           INSERT INTO located_tiles (x, y) SELECT x, y FROM todo
           ON CONFLICT DO NOTHING
           RETURNING x, y
         ),
         hits AS (
           SELECT m.x, m.y, p.country_code, p.geom,
             ST_Covers(p.geom, ST_TileEnvelope(${TILE_ZOOM}, m.x, m.y)) AS covered
           FROM marked m
           JOIN country_parts p ON ST_Intersects(p.geom, ST_TileEnvelope(${TILE_ZOOM}, m.x, m.y))
         ),
         bits AS (
           SELECT x, y, country_code, -1::bigint AS bit FROM hits WHERE covered
           UNION ALL
           SELECT h.x, h.y, h.country_code, 1::bigint << i
           FROM hits h CROSS JOIN generate_series(0, 63) AS i
           WHERE NOT h.covered AND ST_Intersects(h.geom, ST_TileEnvelope(
             ${SUBTILE_ZOOM},
             h.x * ${SUBTILES_PER_SIDE} + i % ${SUBTILES_PER_SIDE},
             h.y * ${SUBTILES_PER_SIDE} + i / ${SUBTILES_PER_SIDE}))
         ),
         inserted AS (
           INSERT INTO tile_countries (x, y, country_code, mask)
           SELECT x, y, country_code, bit_or(bit) FROM bits
           GROUP BY x, y, country_code
         )
         SELECT count(*)::int AS located FROM marked`,
        since ? [limit, since] : [limit],
      );
      return row.located;
    });
  }

  /** A country touched by a located tile whose totals are not computed yet. */
  async nextCountryWithoutTotals(): Promise<string | null> {
    const [row]: { code: string }[] = await this.dataSource.query(
      `SELECT c.code FROM countries c
       WHERE c.total_tiles IS NULL
         AND EXISTS (SELECT 1 FROM tile_countries t WHERE t.country_code = c.code)
       LIMIT 1`,
    );
    return row?.code ?? null;
  }

  /**
   * Counts the tiles touching a country by a quadtree descent from the
   * whole world: a tile inside one part of the country counts with all its
   * descendants, a tile crossing its boundary is split, down to zoom 17.
   * The same descent gives the tile shape of the country: the union of its
   * large tiles, made of the covered tiles down to zoom 14 and of the large
   * tiles crossing its boundary.
   */
  async computeTotals(code: string): Promise<TileTotals> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      await runner.query(
        'CREATE TEMP TABLE frontier (x integer, y integer) ON COMMIT DROP',
      );
      await runner.query('INSERT INTO frontier VALUES (0, 0)');
      await runner.query(
        'CREATE TEMP TABLE shape_tiles (zoom integer, x integer, y integer) ON COMMIT DROP',
      );
      let totals: TileTotals = { tiles: 0, subtiles: 0 };
      for (let zoom = 1; zoom <= SUBTILE_ZOOM; zoom++) {
        await runner.query(
          `CREATE TEMP TABLE children ON COMMIT DROP AS
           SELECT c.x, c.y, bool_or(ST_Covers(p.geom, c.envelope)) AS covered
           FROM (
             SELECT f.x * 2 + dx AS x, f.y * 2 + dy AS y,
               ST_TileEnvelope($2, f.x * 2 + dx, f.y * 2 + dy) AS envelope
             FROM frontier f, generate_series(0, 1) dx, generate_series(0, 1) dy
           ) c
           JOIN country_parts p
             ON p.country_code = $1 AND ST_Intersects(p.geom, c.envelope)
           GROUP BY c.x, c.y`,
          [code, zoom],
        );
        const [level] = (await runner.query(
          `SELECT count(*) FILTER (WHERE covered)::int AS covered,
             count(*) FILTER (WHERE NOT covered)::int AS partial
           FROM children`,
        )) as { covered: number; partial: number }[];
        totals = addLevel(totals, zoom, level.covered, level.partial);
        if (zoom <= TILE_ZOOM) {
          await runner.query(
            `INSERT INTO shape_tiles
             SELECT $1, x, y FROM children WHERE covered OR $1 = ${TILE_ZOOM}`,
            [zoom],
          );
        }
        await runner.query('DROP TABLE frontier');
        await runner.query(
          'CREATE TEMP TABLE frontier ON COMMIT DROP AS SELECT x, y FROM children WHERE NOT covered',
        );
        await runner.query('DROP TABLE children');
      }
      await runner.query(
        `UPDATE countries SET total_tiles = $2, total_subtiles = $3,
           tile_shape = (
             SELECT ST_Multi(ST_CollectionExtract(
               ST_Union(ST_TileEnvelope(zoom, x, y), ${SHAPE_GRID_M}), 3))
             FROM shape_tiles
           ),
           computed_at = now()
         WHERE code = $1`,
        [code, totals.tiles, totals.subtiles],
      );
      await runner.commitTransaction();
      return totals;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  /** Completion of every country touched by the tiles of the user. */
  async completion(userId: string): Promise<CountriesCompletion> {
    const rows: {
      code: string;
      tiles: number;
      subtiles: number;
      total_tiles: number | null;
      total_subtiles: string | null;
    }[] = await this.dataSource.query(
      `WITH cells AS (${USER_CELLS})
       SELECT c.code, count(*)::int AS tiles,
         sum(bit_count((cells.mask & t.mask)::bit(64)))::int AS subtiles,
         c.total_tiles, c.total_subtiles
       FROM cells
       JOIN tile_countries t USING (x, y)
       JOIN countries c ON c.code = t.country_code
       GROUP BY c.code
       ORDER BY tiles DESC, subtiles DESC, c.code`,
      [userId],
    );
    const [state]: { pending: number; version: string | null }[] =
      await this.dataSource.query(
        `WITH cells AS (${USER_CELLS})
         SELECT
           (SELECT count(*)::int FROM cells WHERE NOT EXISTS (
             SELECT 1 FROM located_tiles l WHERE l.x = cells.x AND l.y = cells.y
           )) AS pending,
           (SELECT floor(extract(epoch FROM max(computed_at)) * 1000)::text
            FROM countries) AS version`,
        [userId],
      );
    return {
      countries: rows.map((row) => ({
        code: row.code,
        tiles: { visited: row.tiles, total: row.total_tiles },
        subtiles: {
          visited: row.subtiles,
          total:
            row.total_subtiles === null ? null : Number(row.total_subtiles),
        },
      })),
      pendingTiles: state.pending,
      shapesVersion: state.version,
    };
  }

  /**
   * Vector tile (Mapbox Vector Tile) of the union of the tile shapes of the
   * given countries: one area, so that the large tiles shared by two of them
   * are drawn once, and its borders with the other countries. Geography
   * only: the map asks for the countries the user visited.
   */
  async shapesTile(
    zoom: number,
    x: number,
    y: number,
    codes: string[],
  ): Promise<Buffer> {
    // The shapes are clipped beyond the buffer of the tile: the edges added
    // by the clipping fall outside the buffer, where the borders are cut.
    const [row]: { tile: Buffer }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($1, $2, $3) AS envelope),
       clip AS (
         SELECT ST_Expand(envelope,
           (ST_XMax(envelope) - ST_XMin(envelope)) * ${(2 * MVT_BUFFER) / MVT_EXTENT}) AS box
         FROM bounds
       ),
       merged AS (
         SELECT ST_Union(ST_ClipByBox2D(c.tile_shape, clip.box), ${SHAPE_GRID_M}) AS geom
         FROM countries c, clip
         WHERE c.code = ANY($4) AND c.tile_shape && clip.box
       ),
       areas AS (
         SELECT ST_AsMVTGeom(m.geom, b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM merged m, bounds b WHERE m.geom IS NOT NULL
       ),
       borders AS (
         SELECT ST_AsMVTGeom(ST_Boundary(m.geom), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM merged m, bounds b WHERE m.geom IS NOT NULL
       )
       SELECT
         (SELECT ST_AsMVT(areas, '${SHAPES_AREA_LAYER}', ${MVT_EXTENT}, 'geom')
          FROM areas WHERE geom IS NOT NULL)
         || (SELECT ST_AsMVT(borders, '${SHAPES_BORDER_LAYER}', ${MVT_EXTENT}, 'geom')
          FROM borders WHERE geom IS NOT NULL) AS tile`,
      [zoom, x, y, codes],
    );
    return row.tile;
  }
}

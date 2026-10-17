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
}

export interface CountryOutlines {
  type: 'FeatureCollection';
  features: {
    type: 'Feature';
    properties: { code: string };
    geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
  }[];
}

/** Large tiles of the user, with their small tiles. */
const USER_CELLS = `
  SELECT x, y, bit_or(mask) AS mask FROM activity_tiles
  WHERE user_id = $1
  GROUP BY x, y
  HAVING bit_or(mask) <> 0`;

/** Decimals of the outline coordinates (about 100 m). */
const OUTLINE_DECIMALS = 3;

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

  /**
   * Locates up to `limit` visited large tiles not located yet: for each
   * country they touch, the mask of their small tiles touching it. A tile
   * inside a part of a country gets every small tile without testing them.
   * Returns the number of tiles located.
   */
  async locateTiles(limit: number): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const [row]: { located: number }[] = await manager.query(
        `WITH todo AS (
           SELECT DISTINCT t.x, t.y FROM activity_tiles t
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
        [limit],
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
        await runner.query('DROP TABLE frontier');
        await runner.query(
          'CREATE TEMP TABLE frontier ON COMMIT DROP AS SELECT x, y FROM children WHERE NOT covered',
        );
        await runner.query('DROP TABLE children');
      }
      await runner.query(
        'UPDATE countries SET total_tiles = $2, total_subtiles = $3 WHERE code = $1',
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
    const [pending]: { tiles: number }[] = await this.dataSource.query(
      `WITH cells AS (${USER_CELLS})
       SELECT count(*)::int AS tiles FROM cells
       WHERE NOT EXISTS (
         SELECT 1 FROM located_tiles l WHERE l.x = cells.x AND l.y = cells.y
       )`,
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
      pendingTiles: pending.tiles,
    };
  }

  /** Simplified outlines of the countries touched by the tiles of the user. */
  async outlines(userId: string): Promise<CountryOutlines> {
    const [row]: { outlines: CountryOutlines }[] = await this.dataSource.query(
      `WITH cells AS (${USER_CELLS})
       SELECT json_build_object(
         'type', 'FeatureCollection',
         'features', COALESCE(json_agg(json_build_object(
           'type', 'Feature',
           'properties', json_build_object('code', c.code),
           'geometry', ST_AsGeoJSON(c.outline, ${OUTLINE_DECIMALS})::json
         )), '[]'::json)
       ) AS outlines
       FROM countries c
       WHERE c.code IN (
         SELECT t.country_code FROM cells JOIN tile_countries t USING (x, y)
       )`,
      [userId],
    );
    return row.outlines;
  }
}

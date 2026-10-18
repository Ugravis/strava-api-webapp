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
   * Changes whenever the tile shape of one of these countries is computed:
   * the vector tiles of their shapes can be cached until it changes. Null
   * without shapes.
   */
  shapesVersion: string | null;
}

/** A country seen as a sector of the map, for one user. */
export interface CountrySector {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: LevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: LevelCompletion;
  /** Start of the first activity that gained a small tile in it; null without any. */
  firstVisitAt: string | null;
  /** Start of the latest activity that crossed it; null without any. */
  lastVisitAt: string | null;
  /** Main landmass, `[west, south, east, north]` in degrees; null without land. */
  bounds: [number, number, number, number] | null;
  /**
   * Changes whenever the tile shape is computed: the vector tiles of the
   * area outside the sector can be cached until it changes. Null while it
   * is being computed.
   */
  shapeVersion: string | null;
}

/** Large tiles of the user, with their small tiles. */
const USER_CELLS = 'SELECT x, y, mask FROM user_tiles WHERE user_id = $1';

/** Layers of the shape tiles: the merged areas and their outer borders. */
const SHAPES_AREA_LAYER = 'visited';
const SHAPES_BORDER_LAYER = 'borders';
/** Layers of the sector tiles: the area outside the sector and its border. */
const SECTOR_OUTSIDE_LAYER = 'outside';
const SECTOR_BORDER_LAYER = 'border';
/**
 * Distance between two parts of a country still counted as one landmass, in
 * meters: the parts of the subdivided land touch, up to rounding.
 */
const LANDMASS_GAP_M = 1;
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;
/** Snapping grid of the tile shapes, in meters: tile edges computed at different zooms meet exactly. */
const SHAPE_GRID_M = 1;
/** Large tiles touching the country `$2`, with their small tiles touching it. */
const COUNTRY_ZONE =
  'SELECT x, y, mask FROM tile_countries WHERE country_code = $2';
/**
 * Below this number of large tiles of the user in a country, its latest
 * visit is found from the activities crossing them rather than from the
 * latest activities of the user.
 */
const LAST_VISIT_JOIN_MAX_TILES = 2_000;
/** `focus_bounds` as `[west, south, east, north]` in degrees, null when not computed. */
const BOUNDS_IN_DEGREES = `CASE WHEN focus_bounds IS NOT NULL THEN (
  SELECT json_build_array(ST_XMin(b), ST_YMin(b), ST_XMax(b), ST_YMax(b))
  FROM ST_Transform(focus_bounds, 4326) AS b
) END`;

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

  /**
   * A country whose totals are not computed yet: first those touched by a
   * located tile, then those looked at as a sector, the latest first.
   */
  async nextCountryWithoutTotals(): Promise<string | null> {
    const [row]: { code: string }[] = await this.dataSource.query(
      `SELECT code FROM (
         SELECT c.code, c.requested_at,
           EXISTS (SELECT 1 FROM tile_countries t WHERE t.country_code = c.code) AS visited
         FROM countries c
         WHERE c.total_tiles IS NULL
       ) c
       WHERE visited OR requested_at IS NOT NULL
       ORDER BY visited DESC, requested_at DESC
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
      /** Milliseconds since the epoch, when the tile shape was computed. */
      computed_at: string | null;
    }[] = await this.dataSource.query(
      `WITH cells AS (${USER_CELLS})
       SELECT c.code, count(*)::int AS tiles,
         sum(bit_count((cells.mask & t.mask)::bit(64)))::int AS subtiles,
         c.total_tiles, c.total_subtiles,
         floor(extract(epoch FROM c.computed_at) * 1000)::bigint::text AS computed_at
       FROM cells
       JOIN tile_countries t USING (x, y)
       JOIN countries c ON c.code = t.country_code
       GROUP BY c.code
       ORDER BY tiles DESC, subtiles DESC, c.code`,
      [userId],
    );
    const [state]: { pending: number }[] = await this.dataSource.query(
      `WITH cells AS (${USER_CELLS})
       SELECT count(*)::int AS pending FROM cells WHERE NOT EXISTS (
         SELECT 1 FROM located_tiles l WHERE l.x = cells.x AND l.y = cells.y
       )`,
      [userId],
    );
    // Only the shapes of the countries of the user: a country visited by
    // another user leaves the cache of their shapes intact.
    const computed = rows.flatMap((row) =>
      row.computed_at === null ? [] : [Number(row.computed_at)],
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
      shapesVersion: computed.length > 0 ? String(Math.max(...computed)) : null,
    };
  }

  /** Codes of every country, visited or not. */
  async codes(): Promise<string[]> {
    const rows: { code: string }[] = await this.dataSource.query(
      'SELECT code FROM countries ORDER BY code',
    );
    return rows.map((row) => row.code);
  }

  /**
   * A country as a sector for the user: their tiles in it and its totals,
   * their first and latest visits, and the bounds of its main landmass,
   * computed once. Without totals, the country is requested from the
   * worker. Null for an unknown country.
   */
  async sector(userId: string, code: string): Promise<CountrySector | null> {
    const [country]: {
      total_tiles: number | null;
      total_subtiles: string | null;
      computed_at: string | null;
      bounds: [number, number, number, number] | null;
    }[] = await this.dataSource.query(
      `SELECT total_tiles, total_subtiles,
         floor(extract(epoch FROM computed_at) * 1000)::bigint::text AS computed_at,
         ${BOUNDS_IN_DEGREES} AS bounds
       FROM countries WHERE code = $1`,
      [code],
    );
    if (!country) {
      return null;
    }
    const bounds = country.bounds ?? (await this.computeFocusBounds(code));
    if (country.total_tiles === null) {
      await this.dataSource.query(
        'UPDATE countries SET requested_at = now() WHERE code = $1',
        [code],
      );
    }
    const [visits]: {
      tiles: number;
      subtiles: number;
      first_visit_at: Date | null;
    }[] = await this.dataSource.query(
      `WITH zone AS (${COUNTRY_ZONE}),
       cells AS (
         SELECT u.x, u.y, u.mask & z.mask AS mask
         FROM user_tiles u JOIN zone z USING (x, y)
         WHERE u.user_id = $1
       )
       SELECT
         (SELECT count(*)::int FROM cells) AS tiles,
         (SELECT coalesce(sum(bit_count(mask::bit(64))), 0)::int FROM cells) AS subtiles,
         (SELECT min(f.visited_at) FROM tile_first_visits f JOIN zone z USING (x, y)
          WHERE f.user_id = $1 AND f.mask & z.mask <> 0) AS first_visit_at`,
      [userId, code],
    );
    const lastVisitAt =
      visits.tiles > 0
        ? await this.lastVisit(userId, code, visits.tiles)
        : null;
    return {
      code,
      tiles: { visited: visits.tiles, total: country.total_tiles },
      subtiles: {
        visited: visits.subtiles,
        total:
          country.total_subtiles === null
            ? null
            : Number(country.total_subtiles),
      },
      firstVisitAt: visits.first_visit_at?.toISOString() ?? null,
      lastVisitAt: lastVisitAt?.toISOString() ?? null,
      bounds,
      shapeVersion: country.computed_at,
    };
  }

  /**
   * Start of the latest activity of the user crossing a country. In a
   * country with few tiles of the user, from the activities crossing them;
   * otherwise from the latest activities of the user, until one crosses it,
   * which is soon in a country visited often.
   */
  private async lastVisit(
    userId: string,
    code: string,
    tiles: number,
  ): Promise<Date | null> {
    const [row]: { started_at: Date | null }[] =
      tiles < LAST_VISIT_JOIN_MAX_TILES
        ? await this.dataSource.query(
            `SELECT max(a.started_at) AS started_at
             FROM activity_tiles t
             JOIN (${COUNTRY_ZONE}) z USING (x, y)
             JOIN activities a ON a.id = t.activity_id
             WHERE t.user_id = $1 AND t.mask & z.mask <> 0`,
            [userId, code],
          )
        : await this.dataSource.query(
            `SELECT a.started_at FROM activities a
             WHERE a.user_id = $1 AND EXISTS (
               SELECT 1 FROM activity_tiles t
               JOIN tile_countries z
                 ON z.x = t.x AND z.y = t.y AND z.country_code = $2
               WHERE t.activity_id = a.id AND t.mask & z.mask <> 0
             )
             ORDER BY a.started_at DESC LIMIT 1`,
            [userId, code],
          );
    return row?.started_at ?? null;
  }

  /**
   * Bounds of the largest landmass of a country, made of its parts touching
   * one another: a country with territories overseas is framed on its
   * mainland. Stored for the next requests.
   */
  private async computeFocusBounds(
    code: string,
  ): Promise<[number, number, number, number] | null> {
    const [row]: { bounds: [number, number, number, number] | null }[] =
      await this.dataSource.query(
        `WITH parts AS (
           SELECT geom,
             ST_ClusterDBSCAN(geom, eps := ${LANDMASS_GAP_M}, minpoints := 1) OVER () AS landmass
           FROM country_parts WHERE country_code = $1
         ),
         main AS (
           SELECT ST_SetSRID(ST_Extent(geom)::geometry, 3857) AS box
           FROM parts GROUP BY landmass
           ORDER BY sum(ST_Area(geom)) DESC LIMIT 1
         ),
         updated AS (
           UPDATE countries c SET focus_bounds = main.box
           FROM main WHERE c.code = $1
           RETURNING c.focus_bounds
         )
         SELECT ${BOUNDS_IN_DEGREES} AS bounds FROM updated`,
        [code],
      );
    return row?.bounds ?? null;
  }

  /**
   * Vector tile of the area outside the tile shape of a country, and of the
   * border of that shape. Geography only, empty while the shape is not
   * computed.
   */
  async sectorTile(
    zoom: number,
    x: number,
    y: number,
    code: string,
  ): Promise<Buffer> {
    // The difference is taken in the coordinates of the tile, once the shape
    // is simplified to them: cheap even for the largest countries zoomed
    // out. Its rings are then oriented as `ST_AsMVTGeom` does, its y axis
    // pointing down. Clipped beyond the buffer of the tile, like the shapes.
    const box = `ST_MakeEnvelope(${-MVT_BUFFER}, ${-MVT_BUFFER}, ${MVT_EXTENT + MVT_BUFFER}, ${MVT_EXTENT + MVT_BUFFER}, 3857)`;
    const [row]: { tile: Buffer | null }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($1, $2, $3) AS envelope),
       clip AS (
         SELECT ST_Expand(envelope,
           (ST_XMax(envelope) - ST_XMin(envelope)) * ${(2 * MVT_BUFFER) / MVT_EXTENT}) AS box
         FROM bounds
       ),
       shape AS (
         SELECT CASE WHEN c.tile_shape && clip.box THEN ST_AsMVTGeom(
           ST_ClipByBox2D(c.tile_shape, clip.box), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true)
         END AS geom
         FROM countries c, clip, bounds b
         WHERE c.code = $4 AND c.tile_shape IS NOT NULL
       ),
       outside AS (
         SELECT ST_ForcePolygonCCW(
           CASE WHEN geom IS NULL THEN ${box} ELSE ST_Difference(${box}, geom) END
         ) AS geom
         FROM shape
       ),
       border AS (
         SELECT ST_Boundary(geom) AS geom FROM shape WHERE geom IS NOT NULL
       )
       SELECT
         (SELECT ST_AsMVT(outside, '${SECTOR_OUTSIDE_LAYER}', ${MVT_EXTENT}, 'geom')
          FROM outside WHERE NOT ST_IsEmpty(geom))
         || (SELECT ST_AsMVT(border, '${SECTOR_BORDER_LAYER}', ${MVT_EXTENT}, 'geom')
          FROM border) AS tile`,
      [zoom, x, y, code],
    );
    return row.tile ?? Buffer.alloc(0);
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

import type { AdminRegion, AdminRegionsList } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiErrorCode, ApiErrors } from '../../common/api-error';

/** A country: ISO 3166-1 alpha-2, the only kind of region so far. */
const COUNTRY_CODE = /^[A-Z]{2}$/;

interface RegionRow {
  code: string;
  visitors: number;
  total_tiles: number | null;
  total_subtiles: string | null;
  visited_tiles: number;
  visited_subtiles: number;
  computed_at: Date | null;
  requested_at: Date | null;
  stations: number;
  held_stations: number;
  rail_m: number;
  visited_rail_m: number;
}

/**
 * Every country with its figures, or the one of `$1` (null for all): each
 * figure grouped once per country, then joined. The visitors are the rows
 * of `user_countries`, kept by the changes of the tiles; the small tiles
 * those of any member, each counted once.
 */
const REGIONS = `WITH visitors AS (
     SELECT country_code, count(*)::int AS visitors FROM user_countries
     WHERE $1::char(2) IS NULL OR country_code = $1 GROUP BY country_code
   ),
   tiles AS (
     SELECT t.country_code, count(*)::int AS tiles,
       sum(bit_count((h.mask & t.mask)::bit(64)))::int AS subtiles
     FROM tile_countries t
     CROSS JOIN LATERAL (
       SELECT bit_or(u.mask) AS mask FROM user_tiles u WHERE u.x = t.x AND u.y = t.y
     ) h
     WHERE h.mask IS NOT NULL AND ($1::char(2) IS NULL OR t.country_code = $1)
     GROUP BY t.country_code
   ),
   stations AS (
     SELECT country_code, count(*)::int AS stations,
       count(*) FILTER (WHERE holders > 0)::int AS held
     FROM places WHERE kind = 'station' AND ($1::char(2) IS NULL OR country_code = $1)
     GROUP BY country_code
   ),
   -- A link between two stations visited, by any members.
   rails AS (
     SELECT rc.country_code, sum(rc.length_m) AS length_m,
       sum(rc.length_m) FILTER (WHERE a.holders > 0 AND b.holders > 0) AS visited_m
     FROM rail_link_countries rc
     JOIN rail_links l ON l.id = rc.link_id
     JOIN places a ON a.id = l.station_a
     JOIN places b ON b.id = l.station_b
     WHERE $1::char(2) IS NULL OR rc.country_code = $1
     GROUP BY rc.country_code
   )
   SELECT c.code, COALESCE(v.visitors, 0) AS visitors,
     c.total_tiles, c.total_subtiles,
     COALESCE(t.tiles, 0) AS visited_tiles, COALESCE(t.subtiles, 0) AS visited_subtiles,
     c.computed_at, c.requested_at,
     COALESCE(s.stations, 0) AS stations, COALESCE(s.held, 0) AS held_stations,
     COALESCE(round(r.length_m), 0)::int AS rail_m,
     COALESCE(round(r.visited_m), 0)::int AS visited_rail_m
   FROM countries c
   LEFT JOIN visitors v ON v.country_code = c.code
   LEFT JOIN tiles t ON t.country_code = c.code
   LEFT JOIN stations s ON s.country_code = c.code
   LEFT JOIN rails r ON r.country_code = c.code
   WHERE $1::char(2) IS NULL OR c.code = $1
   ORDER BY visitors DESC, c.code`;

/**
 * The regions of the dataset, read only: the countries imported from
 * Overture Maps so far, their subdivisions to come as other kinds.
 */
@Injectable()
export class AdminRegionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(): Promise<AdminRegionsList> {
    const [rows, [members]] = await Promise.all([
      this.dataSource.query<RegionRow[]>(REGIONS, [null]),
      this.dataSource.query<{ count: number }[]>(
        'SELECT count(*)::int AS count FROM users',
      ),
    ]);
    return { regions: rows.map(toRegion), members: members.count };
  }

  async region(code: string): Promise<AdminRegion> {
    const [row] = COUNTRY_CODE.test(code)
      ? await this.dataSource.query<RegionRow[]>(REGIONS, [code])
      : [];
    if (!row)
      throw ApiErrors.notFound(ApiErrorCode.NotFound, 'Region not found');
    return toRegion(row);
  }
}

function toRegion(row: RegionRow): AdminRegion {
  return {
    code: row.code,
    kind: 'country',
    visitors: row.visitors,
    totalTiles: row.total_tiles,
    totalSubtiles:
      row.total_subtiles === null ? null : Number(row.total_subtiles),
    visitedTiles: row.visited_tiles,
    visitedSubtiles: row.visited_subtiles,
    computedAt: row.computed_at?.toISOString() ?? null,
    requestedAt: row.requested_at?.toISOString() ?? null,
    stations: row.stations,
    heldStations: row.held_stations,
    railM: row.rail_m,
    visitedRailM: row.visited_rail_m,
  };
}

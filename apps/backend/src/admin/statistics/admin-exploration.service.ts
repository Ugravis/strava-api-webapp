import { type AdminExplorationResponse } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { periodDays } from './statistics-period';

/** How long the totals of the imported railway are kept: they only change on an import. */
const RAILWAY_TOTALS_TTL_MS = 60 * 60 * 1000;

interface RailwayTotals {
  stations: number;
  railwayM: number;
  at: number;
}

/** `YYYY-MM-DD` of a date, in UTC. */
const utcDate = (date: Date) => date.toISOString().slice(0, 10);

/** A row of a daily series: the UTC day and what was gained on it. */
interface DailyRow {
  date: string;
  tiles: number;
  small_tiles: string;
  stations: number;
  railway_m: number | null;
}

/**
 * Common table expressions: `firsts`, the first visit of each station by
 * each user; `stations`, the first visit of each station by anyone;
 * `links`, when each link was first unlocked by one user. `join` and `where`
 * restrict the visits `f`.
 */
export const stationFirsts = (join = '', where = '') => `firsts AS (
    SELECT p.id, f.user_id, min(f.visited_at) AS at FROM places p
    JOIN place_tiles t ON t.place_id = p.id
    JOIN tile_first_visits f ON f.x = t.x AND f.y = t.y AND f.mask & (1::bigint << t.bit) <> 0
    ${join}
    WHERE p.kind = 'station' ${where} GROUP BY p.id, f.user_id
  ), stations AS (
    SELECT id, min(at) AS at FROM firsts GROUP BY id
  ), links AS (
    SELECT l.id, l.length_m, min(greatest(a.at, b.at)) AS at FROM rail_links l
    JOIN firsts a ON a.id = l.station_a
    JOIN firsts b ON b.id = l.station_b AND b.user_id = a.user_id
    GROUP BY l.id, l.length_m
  )`;

/**
 * What the community explored as a whole: the union of the tiles of every
 * user, the stations among them and the railway unlocked. A link counts
 * once one user visited both its stations, as on their own map. Days come
 * from the first visits, i.e. the dates of the activities.
 */
@Injectable()
export class AdminExplorationService {
  private railwayTotals: RailwayTotals | null = null;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exploration(now = new Date()): Promise<AdminExplorationResponse> {
    const days = periodDays(now);
    const from = days[0];
    const [[tiles], [stations], daily, totals] = await Promise.all([
      this.dataSource.query<{ tiles: number; small_tiles: string }[]>(
        `WITH tiles AS (SELECT bit_or(mask) AS mask FROM user_tiles GROUP BY x, y)
         SELECT count(*)::int AS tiles,
           coalesce(sum(bit_count(mask::bit(64))), 0)::bigint AS small_tiles
         FROM tiles`,
      ),
      this.dataSource.query<{ stations: number; railway_m: number | null }[]>(
        `WITH ${stationFirsts()}
         SELECT (SELECT count(*)::int FROM stations) AS stations,
           (SELECT sum(length_m) FROM links) AS railway_m`,
      ),
      this.daily(from),
      this.totals(),
    ]);
    const byDate = new Map(daily.map((row) => [row.date, row]));
    const series = (value: (row: DailyRow) => number) =>
      days.map((day) => {
        const row = byDate.get(utcDate(day));
        return row ? value(row) : 0;
      });
    return {
      dates: days.map(utcDate),
      tiles: { total: tiles.tiles, daily: series((row) => row.tiles) },
      smallTiles: {
        total: Number(tiles.small_tiles),
        daily: series((row) => Number(row.small_tiles)),
      },
      stations: {
        total: stations.stations,
        daily: series((row) => row.stations),
        imported: totals.stations,
      },
      railwayM: {
        total: Math.round(stations.railway_m ?? 0),
        daily: series((row) => Math.round(row.railway_m ?? 0)),
        imported: totals.railwayM,
      },
    };
  }

  /**
   * Tiles, small tiles, stations and railway first reached by anyone on each
   * day since `from`. The small tiles of a row are new when no earlier row
   * of the same large tile, of any user, held them.
   */
  private daily(from: Date): Promise<DailyRow[]> {
    return this.dataSource.query<DailyRow[]>(
      `WITH recent AS (
         SELECT DISTINCT x, y FROM tile_first_visits WHERE visited_at >= $1
       ), visits AS (
         SELECT f.visited_at, f.mask,
           bit_or(f.mask) OVER (PARTITION BY f.x, f.y ORDER BY f.visited_at, f.activity_id
             ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS before
         FROM tile_first_visits f JOIN recent r USING (x, y)
       ), tiles AS (
         SELECT to_char(visited_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
           count(*) FILTER (WHERE before IS NULL)::int AS tiles,
           coalesce(sum(bit_count((mask & ~coalesce(before, 0))::bit(64))), 0)::bigint AS small_tiles
         FROM visits WHERE visited_at >= $1 GROUP BY 1
       ), ${stationFirsts()},
       station_days AS (
         SELECT to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::int AS stations
         FROM stations WHERE at >= $1 GROUP BY 1
       ), link_days AS (
         SELECT to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, sum(length_m) AS railway_m
         FROM links WHERE at >= $1 GROUP BY 1
       )
       SELECT date, coalesce(t.tiles, 0) AS tiles, coalesce(t.small_tiles, 0) AS small_tiles,
         coalesce(s.stations, 0) AS stations, l.railway_m
       FROM tiles t
       FULL JOIN station_days s USING (date)
       FULL JOIN link_days l USING (date)`,
      [from],
    );
  }

  /** The imported stations and railway, read again once an hour. */
  private async totals(now = Date.now()): Promise<RailwayTotals> {
    if (
      this.railwayTotals &&
      now - this.railwayTotals.at < RAILWAY_TOTALS_TTL_MS
    ) {
      return this.railwayTotals;
    }
    const [row] = await this.dataSource.query<
      { stations: number; railway_m: number | null }[]
    >(
      `SELECT (SELECT count(*)::int FROM places WHERE kind = 'station') AS stations,
         (SELECT sum(length_m) FROM rail_links) AS railway_m`,
    );
    this.railwayTotals = {
      stations: row.stations,
      railwayM: Math.round(row.railway_m ?? 0),
      at: now,
    };
    return this.railwayTotals;
  }
}

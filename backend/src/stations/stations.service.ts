import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { SportType } from '../activities/sport-type';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../tiles/tile-grid';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
/** Tolerance of the simplified links sent to the map, in degrees (about 2 m). */
const LINK_SIMPLIFY_DEG = 0.00002;
/** Layer of the vector tiles of the stations. */
const STATIONS_LAYER = 'stations';
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;

/** Stations first visited during an activity. */
export interface StationVisits {
  id: string;
  name: string;
  sportType: SportType;
  startedAt: Date;
  value: number;
}

/** A station whose small tile the user visited. */
export interface VisitedStation {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Start of the first activity crossing its small tile; null until the first visits are replayed. */
  firstVisitAt: string | null;
}

/** Two visited stations linked by the railway. */
export interface UnlockedLink {
  id: number;
  stations: [number, number];
  lengthM: number;
  /** `[lon, lat]` along the tracks, simplified. */
  coords: [number, number][];
}

export interface VisitedStations {
  stations: VisitedStation[];
  links: UnlockedLink[];
  /**
   * Changes with every import of the stations: the vector tiles of all the
   * stations can be cached until it changes. Null without stations.
   */
  stationsVersion: string | null;
}

export interface StationNeighbor {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  lengthM: number;
  /** Whether the user visited it too, unlocking the link. */
  visited: boolean;
}

export interface StationDetails {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Small tile (zoom 17) holding the station. */
  tile: { zoom: typeof SUBTILE_ZOOM; x: number; y: number };
  visited: boolean;
  firstVisitAt: string | null;
  neighbors: StationNeighbor[];
}

/** The railway network of a country and the part the user unlocked. */
export interface CountryRailway {
  /** Length of the links between two stations the user visited, in the country. */
  unlockedM: number;
  totalM: number;
}

/** The train stations of a country and those the user visited. */
export interface CountryStations {
  visited: number;
  total: number;
}

/** Whether the user `u` visited the small tile of the place `p`. */
const PLACE_VISITED = `u.mask & (1::bigint << p.bit) <> 0`;

/** Stations visited by the user `$1`. */
const VISITED_STATIONS = `SELECT p.id, p.name, p.geom, p.x, p.y, p.bit FROM user_tiles u
  JOIN places p ON p.x = u.x AND p.y = u.y
  WHERE u.user_id = $1 AND p.kind = 'station' AND ${PLACE_VISITED}`;

/**
 * Train stations and the links between them, imported from OpenStreetMap
 * by `pnpm stations:import`. A station is visited once its small tile is,
 * and a link unlocked once its two stations are: nothing is stored per user.
 */
@Injectable()
export class StationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * The stations visited by the user, counted on the activity that first
   * visited them: one row per activity bringing at least one, oldest first.
   */
  visitTimeline(userId: string): Promise<StationVisits[]> {
    return this.dataSource.query(
      `WITH visited AS (${VISITED_STATIONS}),
       first_visits AS (
         SELECT DISTINCT ON (v.id) v.id, f.activity_id
         FROM visited v
         JOIN tile_first_visits f ON f.user_id = $1 AND f.x = v.x AND f.y = v.y
           AND f.mask & (1::bigint << v.bit) <> 0
         ORDER BY v.id, f.visited_at
       )
       SELECT a.id, a.name, a.sport_type AS "sportType",
         a.started_at AS "startedAt", count(*)::int AS value
       FROM first_visits fv
       JOIN activities a ON a.id = fv.activity_id
       GROUP BY a.id
       ORDER BY a.started_at, a.id`,
      [userId],
    );
  }

  /** Stations visited by the user, with their first visit, and the links between them. */
  async visited(userId: string): Promise<VisitedStations> {
    const stations: {
      id: number;
      name: string | null;
      lon: number;
      lat: number;
      first_visit_at: Date | null;
    }[] = await this.dataSource.query(
      `WITH visited AS (${VISITED_STATIONS})
       SELECT v.id, v.name, ST_X(v.geom) AS lon, ST_Y(v.geom) AS lat,
         (SELECT min(f.visited_at) FROM tile_first_visits f
          WHERE f.user_id = $1 AND f.x = v.x AND f.y = v.y
            AND f.mask & (1::bigint << v.bit) <> 0) AS first_visit_at
       FROM visited v
       ORDER BY v.id`,
      [userId],
    );
    const ids = stations.map((station) => station.id);
    const links: {
      id: number;
      station_a: number;
      station_b: number;
      length_m: number;
      geojson: string;
    }[] =
      ids.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT id, station_a, station_b, length_m,
               ST_AsGeoJSON(ST_Simplify(geom, ${LINK_SIMPLIFY_DEG}), 6) AS geojson
             FROM rail_links
             WHERE station_a = ANY($1::int[]) AND station_b = ANY($1::int[])
             ORDER BY id`,
            [ids],
          );
    return {
      stations: stations.map((station) => ({
        id: station.id,
        name: station.name,
        lon: station.lon,
        lat: station.lat,
        firstVisitAt: station.first_visit_at?.toISOString() ?? null,
      })),
      links: links.map((link) => ({
        id: link.id,
        stations: [link.station_a, link.station_b],
        lengthM: Math.round(link.length_m),
        coords: (
          JSON.parse(link.geojson) as { coordinates: [number, number][] }
        ).coordinates,
      })),
      stationsVersion: await this.stationsVersion(),
    };
  }

  /** Id of the latest import of the stations; null without any. */
  private async stationsVersion(): Promise<string | null> {
    const [row]: { id: number }[] = await this.dataSource.query(
      'SELECT max(id) AS id FROM railway_imports',
    );
    return row.id === null ? null : String(row.id);
  }

  /** A station, whether the user visited it, and its neighbors. Null for an unknown station. */
  async details(userId: string, id: number): Promise<StationDetails | null> {
    const [station]: {
      id: number;
      name: string | null;
      lon: number;
      lat: number;
      x: number;
      y: number;
      bit: number;
      visited: boolean;
      first_visit_at: Date | null;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.name, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, p.x, p.y, p.bit,
         EXISTS (
           SELECT 1 FROM user_tiles u
           WHERE u.user_id = $1 AND u.x = p.x AND u.y = p.y AND ${PLACE_VISITED}
         ) AS visited,
         (SELECT min(f.visited_at) FROM tile_first_visits f
          WHERE f.user_id = $1 AND f.x = p.x AND f.y = p.y
            AND f.mask & (1::bigint << p.bit) <> 0) AS first_visit_at
       FROM places p WHERE p.id = $2 AND p.kind = 'station'`,
      [userId, id],
    );
    if (!station) {
      return null;
    }
    const neighbors: {
      id: number;
      name: string | null;
      lon: number;
      lat: number;
      length_m: number;
      visited: boolean;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.name, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, l.length_m,
         EXISTS (
           SELECT 1 FROM user_tiles u
           WHERE u.user_id = $1 AND u.x = p.x AND u.y = p.y AND ${PLACE_VISITED}
         ) AS visited
       FROM rail_links l
       JOIN places p ON p.id = CASE WHEN l.station_a = $2 THEN l.station_b ELSE l.station_a END
       WHERE l.station_a = $2 OR l.station_b = $2
       ORDER BY l.length_m`,
      [userId, id],
    );
    return {
      id: station.id,
      name: station.name,
      lon: station.lon,
      lat: station.lat,
      tile: {
        zoom: SUBTILE_ZOOM,
        x: station.x * SUBTILES_PER_SIDE + (station.bit % SUBTILES_PER_SIDE),
        y:
          station.y * SUBTILES_PER_SIDE +
          Math.floor(station.bit / SUBTILES_PER_SIDE),
      },
      visited: station.visited,
      firstVisitAt: station.first_visit_at?.toISOString() ?? null,
      neighbors: neighbors.map((neighbor) => ({
        id: neighbor.id,
        name: neighbor.name,
        lon: neighbor.lon,
        lat: neighbor.lat,
        lengthM: Math.round(neighbor.length_m),
        visited: neighbor.visited,
      })),
    };
  }

  /**
   * The railway network of a country and the share of it between two
   * stations the user visited. Null when no link crosses the country.
   */
  async countryRailway(
    userId: string,
    code: string,
  ): Promise<CountryRailway | null> {
    const [row]: { total_m: number | null; unlocked_m: number | null }[] =
      await this.dataSource.query(
        `WITH visited AS (${VISITED_STATIONS})
         SELECT sum(r.length_m) AS total_m,
           sum(r.length_m) FILTER (
             WHERE l.station_a IN (SELECT id FROM visited)
               AND l.station_b IN (SELECT id FROM visited)
           ) AS unlocked_m
         FROM rail_link_countries r
         JOIN rail_links l ON l.id = r.link_id
         WHERE r.country_code = $2`,
        [userId, code],
      );
    if (row.total_m === null) {
      return null;
    }
    return {
      unlockedM: Math.round(row.unlocked_m ?? 0),
      totalM: Math.round(row.total_m),
    };
  }

  /** Stations of the country `code` and those visited by the user; null without any. */
  async countryStations(
    userId: string,
    code: string,
  ): Promise<CountryStations | null> {
    const [row]: { total: number; visited: number }[] =
      await this.dataSource.query(
        `SELECT count(*)::int AS total,
           count(*) FILTER (WHERE ${PLACE_VISITED})::int AS visited
         FROM places p
         LEFT JOIN user_tiles u ON u.user_id = $1 AND u.x = p.x AND u.y = p.y
         WHERE p.kind = 'station' AND p.country_code = $2`,
        [userId, code],
      );
    return row.total === 0 ? null : row;
  }

  /** Vector tile of every station, visited or not: geography only. */
  async stationsTile(zoom: number, x: number, y: number): Promise<Buffer> {
    const [row]: { tile: Buffer | null }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($1, $2, $3) AS envelope),
       points AS (
         SELECT p.id, p.name,
           ST_AsMVTGeom(ST_Transform(p.geom, 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM places p, bounds b
         WHERE p.kind = 'station'
           AND p.geom && ST_Transform(ST_Expand(b.envelope,
             (ST_XMax(b.envelope) - ST_XMin(b.envelope)) * ${MVT_BUFFER / MVT_EXTENT}), 4326)
       )
       SELECT ST_AsMVT(points, '${STATIONS_LAYER}', ${MVT_EXTENT}, 'geom', 'id') AS tile
       FROM points WHERE geom IS NOT NULL`,
      [zoom, x, y],
    );
    return row.tile ?? Buffer.alloc(0);
  }

  /** Report of the latest import of the stations; null without any. */
  async latestImport(): Promise<{
    id: number;
    importedAt: string;
    report: unknown;
  } | null> {
    const [row]: { id: number; imported_at: Date; report: unknown }[] =
      await this.dataSource.query(
        'SELECT id, imported_at, report FROM railway_imports ORDER BY id DESC LIMIT 1',
      );
    return row
      ? {
          id: row.id,
          importedAt: row.imported_at.toISOString(),
          report: row.report,
        }
      : null;
  }
}

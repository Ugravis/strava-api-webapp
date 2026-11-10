import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { SportType } from '../activities/sport-type';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../tiles/tile-grid';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
/** Tolerance of the simplified links sent to the map, in degrees (about 2 m). */
const LINK_SIMPLIFY_DEG = 0.00002;
/** Layers of the vector tiles of the stations: their points, their footprints and the small tiles of their zones. */
const STATIONS_LAYER = 'stations';
const FOOTPRINTS_LAYER = 'station-footprints';
const ZONES_LAYER = 'station-zones';
/** The footprints and zones are served from this zoom, fading in to be whole at 13: smaller, they are a few pixels. */
const FOOTPRINTS_MIN_ZOOM = 12;
/** Bumped when the layers of the vector tiles change: the browser caches them for good, by version. */
const TILE_FORMAT = 2;
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;

interface SmallTile {
  zoom: typeof SUBTILE_ZOOM;
  x: number;
  y: number;
}

/** A small tile from its large tile and its bit, as stored. */
function subtile(x: number, y: number, bit: number): SmallTile {
  return {
    zoom: SUBTILE_ZOOM,
    x: x * SUBTILES_PER_SIDE + (bit % SUBTILES_PER_SIDE),
    y: y * SUBTILES_PER_SIDE + Math.floor(bit / SUBTILES_PER_SIDE),
  };
}

/** Stations first visited during an activity. */
export interface StationVisits {
  id: string;
  name: string;
  sportType: SportType;
  startedAt: Date;
  value: number;
}

/** A station with a small tile of its zone visited by the user. */
export interface VisitedStation {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Start of the first activity crossing its zone; null until the first visits are replayed. */
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
  /** Small tile (zoom 17) holding the station point. */
  tile: SmallTile;
  /** Small tiles of its zone: visiting any of them visits the station. */
  tiles: SmallTile[];
  visited: boolean;
  firstVisitAt: string | null;
  neighbors: StationNeighbor[];
}

export interface StationTotals {
  visited: number;
  unlockedM: number;
}

/** Stations and railway of the history at a date: gained since it, or visited before it. */
export interface StationHistoryTotals {
  stations: number;
  railwayM: number;
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

/** Whether the user `$1` visited a small tile of the zone of the place `p`. */
const PLACE_VISITED = `EXISTS (
  SELECT 1 FROM place_tiles t
  JOIN user_tiles u ON u.user_id = $1 AND u.x = t.x AND u.y = t.y
    AND u.mask & (1::bigint << t.bit) <> 0
  WHERE t.place_id = p.id
)`;

/** Stations visited by the user `$1`: a small tile of their zone at least. */
const VISITED_STATIONS = `SELECT p.id, p.name, p.geom FROM places p
  WHERE p.id IN (
    SELECT t.place_id FROM user_tiles u
    JOIN place_tiles t ON t.x = u.x AND t.y = u.y AND u.mask & (1::bigint << t.bit) <> 0
    WHERE u.user_id = $1
  ) AND p.kind = 'station'`;

/** First visits by the user `$1` of the small tiles of the zone of the place `v`. */
const ZONE_FIRST_VISITS = `place_tiles t
  JOIN tile_first_visits f ON f.user_id = $1 AND f.x = t.x AND f.y = t.y
    AND f.mask & (1::bigint << t.bit) <> 0`;

/**
 * Train stations and the links between them, imported from OpenStreetMap
 * by `pnpm stations:import`. A station is visited once a small tile of its
 * zone is (`place_tiles`), and a link unlocked once its two stations are:
 * nothing is stored per user.
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
         JOIN ${ZONE_FIRST_VISITS} ON t.place_id = v.id
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

  /**
   * Stations first visited since `date`, or before it, and the railway
   * unlocked in the same period: a link is unlocked at the later first
   * visit of its two stations. Stations whose first visit is not replayed
   * yet are left out, as their tiles are from the history.
   */
  async historyTotals(
    userId: string,
    gained: boolean,
    date: Date,
  ): Promise<StationHistoryTotals> {
    const inPeriod = (at: string) => `${at} ${gained ? '>=' : '<'} $2`;
    const [row]: { stations: number; railway_m: number | null }[] =
      await this.dataSource.query(
        `WITH visited AS (${VISITED_STATIONS}),
         first_visits AS (
           SELECT v.id, min(f.visited_at) AS at
           FROM visited v
           JOIN ${ZONE_FIRST_VISITS} ON t.place_id = v.id
           GROUP BY v.id
         )
         SELECT (SELECT count(*)::int FROM first_visits WHERE ${inPeriod('at')}) AS stations,
           (SELECT sum(l.length_m) FROM rail_links l
            JOIN first_visits a ON a.id = l.station_a
            JOIN first_visits b ON b.id = l.station_b
            WHERE ${inPeriod('greatest(a.at, b.at)')}) AS railway_m`,
        [userId, date],
      );
    return {
      stations: row.stations,
      railwayM: Math.round(row.railway_m ?? 0),
    };
  }

  /** Number of stations visited by the user, and length of the railway unlocked between them. */
  async totals(userId: string): Promise<StationTotals> {
    const [row]: { visited: number; unlocked_m: number | null }[] =
      await this.dataSource.query(
        `WITH visited AS (${VISITED_STATIONS})
         SELECT (SELECT count(*)::int FROM visited) AS visited,
           (SELECT sum(l.length_m) FROM rail_links l
            WHERE l.station_a IN (SELECT id FROM visited)
              AND l.station_b IN (SELECT id FROM visited)) AS unlocked_m`,
        [userId],
      );
    return { visited: row.visited, unlockedM: Math.round(row.unlocked_m ?? 0) };
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
         (SELECT min(f.visited_at) FROM ${ZONE_FIRST_VISITS}
          WHERE t.place_id = v.id) AS first_visit_at
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

  /**
   * Id of the latest import of the stations, and of the latest change of
   * their zones (recomputed alone by `--zones-only`); null without any.
   */
  private async stationsVersion(): Promise<string | null> {
    const [row]: { id: number | null; changed: string | null }[] =
      await this.dataSource.query(
        `SELECT (SELECT max(id) FROM railway_imports) AS id,
           (SELECT floor(extract(epoch FROM max(updated_at)))::bigint
            FROM places WHERE kind = 'station') AS changed`,
      );
    return row.id === null
      ? null
      : `${row.id}-${row.changed ?? 0}-${TILE_FORMAT}`;
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
      tiles: [number, number, number][];
    }[] = await this.dataSource.query(
      `SELECT p.id, p.name, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, p.x, p.y, p.bit,
         ${PLACE_VISITED} AS visited,
         (SELECT min(f.visited_at) FROM ${ZONE_FIRST_VISITS}
          WHERE t.place_id = p.id) AS first_visit_at,
         (SELECT json_agg(json_build_array(t.x, t.y, t.bit) ORDER BY t.y, t.bit, t.x)
          FROM place_tiles t WHERE t.place_id = p.id) AS tiles
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
         ${PLACE_VISITED} AS visited
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
      tile: subtile(station.x, station.y, station.bit),
      tiles: station.tiles.map(([x, y, bit]) => subtile(x, y, bit)),
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
        `WITH visited AS (${VISITED_STATIONS})
         SELECT count(*)::int AS total,
           count(*) FILTER (WHERE p.id IN (SELECT id FROM visited))::int AS visited
         FROM places p
         WHERE p.kind = 'station' AND p.country_code = $2`,
        [userId, code],
      );
    return row.total === 0 ? null : row;
  }

  /** Vector tile of every station, visited or not, with their footprints and zone tiles zoomed in: geography only. */
  async stationsTile(zoom: number, x: number, y: number): Promise<Buffer> {
    const [row]: { tile: Buffer | null }[] = await this.dataSource.query(
      `WITH bounds AS (SELECT ST_TileEnvelope($1, $2, $3) AS envelope),
       footprints AS (
         SELECT p.id,
           ST_AsMVTGeom(ST_Transform(p.footprint, 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM places p, bounds b
         WHERE $1 >= ${FOOTPRINTS_MIN_ZOOM} AND p.kind = 'station'
           AND p.footprint && ST_Transform(b.envelope, 4326)
       ),
       zones AS (
         SELECT t.place_id AS id,
           ST_AsMVTGeom(ST_TileEnvelope(${SUBTILE_ZOOM},
             t.x * ${SUBTILES_PER_SIDE} + t.bit % ${SUBTILES_PER_SIDE},
             t.y * ${SUBTILES_PER_SIDE} + t.bit / ${SUBTILES_PER_SIDE}),
             b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         -- Integer bounds: the index on the large tiles is used.
         FROM place_tiles t
         JOIN places p ON p.id = t.place_id AND p.kind = 'station', bounds b
         WHERE $1 >= ${FOOTPRINTS_MIN_ZOOM}
           AND t.x BETWEEN floor($2 * 2.0 ^ (${TILE_ZOOM} - $1))::int AND (ceil(($2 + 1) * 2.0 ^ (${TILE_ZOOM} - $1)) - 1)::int
           AND t.y BETWEEN floor($3 * 2.0 ^ (${TILE_ZOOM} - $1))::int AND (ceil(($3 + 1) * 2.0 ^ (${TILE_ZOOM} - $1)) - 1)::int
       ),
       points AS (
         SELECT p.id, p.name,
           ST_AsMVTGeom(ST_Transform(p.geom, 3857), b.envelope, ${MVT_EXTENT}, ${MVT_BUFFER}, true) AS geom
         FROM places p, bounds b
         WHERE p.kind = 'station'
           AND p.geom && ST_Transform(ST_Expand(b.envelope,
             (ST_XMax(b.envelope) - ST_XMin(b.envelope)) * ${MVT_BUFFER / MVT_EXTENT}), 4326)
       )
       SELECT coalesce((
           SELECT ST_AsMVT(points, '${STATIONS_LAYER}', ${MVT_EXTENT}, 'geom', 'id')
           FROM points WHERE geom IS NOT NULL
         ), ''::bytea) || coalesce((
           SELECT ST_AsMVT(footprints, '${FOOTPRINTS_LAYER}', ${MVT_EXTENT}, 'geom', 'id')
           FROM footprints WHERE geom IS NOT NULL
         ), ''::bytea) || coalesce((
           SELECT ST_AsMVT(zones, '${ZONES_LAYER}', ${MVT_EXTENT}, 'geom', 'id')
           FROM zones WHERE geom IS NOT NULL
         ), ''::bytea) AS tile`,
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

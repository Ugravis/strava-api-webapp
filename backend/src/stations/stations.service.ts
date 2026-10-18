import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../tiles/tile-grid';
import type { Bbox, OsmRailWay } from './overpass/overpass-queries';
import {
  type GraphStation,
  type RailGraph,
  type RailPath,
  REGION_BUFFER_M,
  REGION_ZOOM,
  type RegionRef,
  regionBbox,
  SNAP_MAX_M,
} from './rail-graph';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
/** Large tiles to their region: zoom 14 to zoom 9. */
const REGION_SHIFT = TILE_ZOOM - REGION_ZOOM;
/** A region is fetched again after this many days, to follow OpenStreetMap. */
const REGION_REFRESH_DAYS = 90;
/** Wait before fetching again a region that failed, per failure in a row, up to a day. */
const REGION_RETRY_HOURS = 1;
const REGION_RETRY_MAX_HOURS = 24;
const WAY_INSERT_BATCH = 2_000;
/** Tolerance of the simplified links sent to the map, in degrees (about 2 m). */
const LINK_SIMPLIFY_DEG = 0.00002;
/** Layer of the vector tiles of the stations. */
const STATIONS_LAYER = 'stations';
const MVT_EXTENT = 4096;
const MVT_BUFFER = 64;

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
  /** Visited stations whose links are still being found. */
  pendingStations: number;
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
  /** Null while its links are being found. */
  neighbors: StationNeighbor[] | null;
}

/** Whether the user visited the small tile of the place `p`. */
const PLACE_VISITED = `u.mask & (1::bigint << p.bit) <> 0`;

/** Envelope of a bbox, in parameters `$i` to `$i + 3`. */
function envelopeSql(i: number): string {
  return `ST_MakeEnvelope($${i + 1}, $${i}, $${i + 3}, $${i + 2}, 4326)`;
}

function wktOf(coords: [number, number][]): string {
  return `LINESTRING(${coords.map(([lon, lat]) => `${lon} ${lat}`).join(',')})`;
}

/**
 * Train stations and the links between them. The stations come from the
 * import; the railway is fetched by region and the links found by the
 * `StationsWorker`, only around the stations visited by a user.
 */
@Injectable()
export class StationsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Requests the links of the stations visited in the large tiles changed
   * after `sinceSeq` (`user_tiles.changed_seq`), and the railway of their
   * regions. Returns the sequence to start from next time.
   */
  async requestVisited(sinceSeq: string): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      const [{ seq }]: { seq: string }[] = await manager.query(
        'SELECT coalesce(max(changed_seq), 0)::text AS seq FROM user_tiles',
      );
      await manager.query(
        `WITH visited AS (
           SELECT DISTINCT p.id, p.x, p.y FROM user_tiles u
           JOIN places p ON p.x = u.x AND p.y = u.y
           WHERE u.changed_seq > $1 AND u.changed_seq <= $2
             AND p.kind = 'station' AND ${PLACE_VISITED}
         ),
         wanted AS (
           INSERT INTO station_link_states (place_id)
           SELECT id FROM visited ON CONFLICT DO NOTHING
           RETURNING place_id
         )
         INSERT INTO rail_regions (x, y)
         SELECT DISTINCT p.x >> ${REGION_SHIFT}, p.y >> ${REGION_SHIFT}
         FROM wanted w JOIN places p ON p.id = w.place_id
         ON CONFLICT DO NOTHING`,
        [sinceSeq, seq],
      );
      return seq;
    });
  }

  /** Requests the railway of regions reached by a walk. */
  async requestRegions(regions: RegionRef[]): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO rail_regions (x, y)
       SELECT * FROM unnest($1::int[], $2::int[])
       ON CONFLICT DO NOTHING`,
      [regions.map(({ x }) => x), regions.map(({ y }) => y)],
    );
  }

  /**
   * The region to fetch next: requested ones first, the oldest first, then
   * failed ones due for a retry, then the oldest fetched beyond the
   * refresh delay. Null when every region is up to date.
   */
  async nextRegionToFetch(): Promise<
    (RegionRef & { refresh: boolean }) | null
  > {
    const [row]: { x: number; y: number; refresh: boolean }[] =
      await this.dataSource.query(
        `SELECT x, y, fetched_at IS NOT NULL AS refresh FROM rail_regions
         WHERE status = 'pending'
           OR (status = 'failed' AND retry_at <= now())
           OR (status = 'done' AND fetched_at < now() - interval '${REGION_REFRESH_DAYS} days')
         ORDER BY (status = 'pending') DESC, (status = 'failed') DESC,
           coalesce(fetched_at, requested_at)
         LIMIT 1`,
      );
    return row ?? null;
  }

  /**
   * Saves the railway of a region, replacing the tracks of a previous
   * fetch. On a refresh, the links crossing the region are found again.
   */
  async saveRegion(
    region: RegionRef,
    ways: OsmRailWay[],
    osmTimestamp: Date | null,
  ): Promise<void> {
    const bbox = regionBbox(region, REGION_BUFFER_M);
    await this.dataSource.transaction(async (manager) => {
      const [{ refresh }]: { refresh: boolean }[] = await manager.query(
        `SELECT EXISTS (
           SELECT 1 FROM rail_regions WHERE x = $1 AND y = $2 AND fetched_at IS NOT NULL
         ) AS refresh`,
        [region.x, region.y],
      );
      if (refresh) {
        await this.resetLinksAround(manager, bbox);
        // Ways crossing the region and gone from OpenStreetMap.
        await manager.query(
          `DELETE FROM rail_ways
           WHERE geom && ${envelopeSql(1)} AND ST_Intersects(geom, ${envelopeSql(1)})
             AND osm_id <> ALL($5::bigint[])`,
          [...bbox, ways.map((way) => way.id)],
        );
      }
      for (let i = 0; i < ways.length; i += WAY_INSERT_BATCH) {
        const batch = ways.slice(i, i + WAY_INSERT_BATCH);
        await manager.query(
          `INSERT INTO rail_ways (osm_id, nodes, geom)
           SELECT id, nodes::bigint[], ST_GeomFromText(wkt, 4326)
           FROM unnest($1::bigint[], $2::text[], $3::text[]) AS w(id, nodes, wkt)
           ON CONFLICT (osm_id) DO UPDATE SET nodes = excluded.nodes, geom = excluded.geom`,
          [
            batch.map((way) => way.id),
            batch.map((way) => `{${way.nodes.join(',')}}`),
            batch.map((way) => wktOf(way.coords)),
          ],
        );
      }
      await manager.query(
        `UPDATE rail_regions SET status = 'done', fetched_at = now(),
           osm_timestamp = $3, attempts = 0, retry_at = NULL, error = NULL
         WHERE x = $1 AND y = $2`,
        [region.x, region.y, osmTimestamp],
      );
    });
  }

  async failRegion(region: RegionRef, error: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE rail_regions SET status = 'failed', attempts = attempts + 1,
         retry_at = now() + least(attempts + 1, ${REGION_RETRY_MAX_HOURS / REGION_RETRY_HOURS})
           * interval '${REGION_RETRY_HOURS} hours',
         error = $3
       WHERE x = $1 AND y = $2`,
      [region.x, region.y, error.slice(0, 1000)],
    );
  }

  /**
   * Visited stations whose links are to be found, with their region, which
   * is fetched: not
   * walked yet, or walked before the latest fetch of a region, which may
   * have been missing.
   */
  async nextStationsToLink(
    limit: number,
  ): Promise<(GraphStation & { region: RegionRef })[]> {
    const rows: {
      id: number;
      lon: number;
      lat: number;
      x: number;
      y: number;
    }[] = await this.dataSource.query(
      `SELECT p.id, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat,
           p.x >> ${REGION_SHIFT} AS x, p.y >> ${REGION_SHIFT} AS y
         FROM station_link_states s
         JOIN places p ON p.id = s.place_id
         JOIN rail_regions r
           ON r.x = p.x >> ${REGION_SHIFT} AND r.y = p.y >> ${REGION_SHIFT}
           AND r.fetched_at IS NOT NULL
         WHERE s.linked_at IS NULL AND (
           s.checked_at IS NULL
           OR s.checked_at < (SELECT max(fetched_at) FROM rail_regions)
         )
         ORDER BY s.checked_at NULLS FIRST, p.x >> ${REGION_SHIFT}, p.y >> ${REGION_SHIFT}
         LIMIT $1`,
      [limit],
    );
    return rows.map(({ x, y, ...station }) => ({
      ...station,
      region: { x, y },
    }));
  }

  /** Which of these regions have their railway. */
  async fetchedRegions(regions: RegionRef[]): Promise<RegionRef[]> {
    return this.dataSource.query(
      `SELECT r.x, r.y FROM rail_regions r
       JOIN unnest($1::int[], $2::int[]) AS q(x, y) ON q.x = r.x AND q.y = r.y
       WHERE r.fetched_at IS NOT NULL`,
      [regions.map(({ x }) => x), regions.map(({ y }) => y)],
    );
  }

  /**
   * Adds to the graph the tracks of a fetched region, then its stations and
   * those just beyond its edges, snapped to them.
   */
  async loadRegion(graph: RailGraph, region: RegionRef): Promise<void> {
    const ways: { osm_id: string; nodes: string[]; geojson: string }[] =
      await this.dataSource.query(
        `SELECT osm_id, nodes, ST_AsGeoJSON(geom) AS geojson FROM rail_ways
         WHERE geom && ${envelopeSql(1)}`,
        regionBbox(region, REGION_BUFFER_M),
      );
    graph.addWays(
      ways.map((way) => ({
        id: Number(way.osm_id),
        nodes: way.nodes.map(Number),
        coords: (JSON.parse(way.geojson) as { coordinates: [number, number][] })
          .coordinates,
      })),
    );
    const stations: GraphStation[] = await this.dataSource.query(
      `SELECT id, ST_X(geom) AS lon, ST_Y(geom) AS lat FROM places
       WHERE kind = 'station' AND geom && ${envelopeSql(1)}`,
      regionBbox(region, SNAP_MAX_M),
    );
    for (const station of stations) {
      graph.addStation(station);
    }
    graph.markLoaded(region);
  }

  /** Saves the links found from a station, each kept with its shortest path. */
  async saveLinks(station: number, links: RailPath[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      for (const link of links) {
        const [a, b] =
          link.from < link.to ? [link.from, link.to] : [link.to, link.from];
        const coords =
          link.from < link.to ? link.coords : [...link.coords].reverse();
        await manager.query(
          `INSERT INTO rail_links (station_a, station_b, geom, length_m)
           VALUES ($1, $2, ST_GeomFromText($3, 4326), $4)
           ON CONFLICT (station_a, station_b) DO UPDATE
             SET geom = excluded.geom, length_m = excluded.length_m
             WHERE excluded.length_m < rail_links.length_m`,
          [a, b, wktOf(coords), link.lengthM],
        );
      }
      await manager.query(
        `UPDATE station_link_states SET checked_at = now(), linked_at = now()
         WHERE place_id = $1`,
        [station],
      );
    });
  }

  /** Records a walk waiting for regions: tried again once a region is fetched. */
  async markChecked(station: number): Promise<void> {
    await this.dataSource.query(
      'UPDATE station_link_states SET checked_at = now() WHERE place_id = $1',
      [station],
    );
  }

  /** Forgets the links crossing an area and those of its stations, to find them again. */
  private async resetLinksAround(
    manager: EntityManager,
    bbox: Bbox,
  ): Promise<void> {
    await manager.query(
      `WITH stale AS (
         SELECT l.id, l.station_a, l.station_b FROM rail_links l
         WHERE l.geom && ${envelopeSql(1)} AND ST_Intersects(l.geom, ${envelopeSql(1)})
       ),
       inside AS (
         SELECT id FROM places WHERE kind = 'station' AND geom && ${envelopeSql(1)}
       ),
       reset AS (
         UPDATE station_link_states SET checked_at = NULL, linked_at = NULL
         WHERE place_id IN (
           SELECT station_a FROM stale UNION SELECT station_b FROM stale
           UNION SELECT id FROM inside
         )
       )
       DELETE FROM rail_links WHERE id IN (SELECT id FROM stale)`,
      bbox,
    );
  }

  /**
   * Stations visited by the user, with their first visit, the links between
   * them, and how many of them still wait for their links.
   */
  async visited(userId: string): Promise<VisitedStations> {
    const stations: {
      id: number;
      name: string | null;
      lon: number;
      lat: number;
      first_visit_at: Date | null;
      linked: boolean;
    }[] = await this.dataSource.query(
      `WITH visited AS (
         SELECT p.id, p.name, p.geom, p.x, p.y, p.bit FROM user_tiles u
         JOIN places p ON p.x = u.x AND p.y = u.y
         WHERE u.user_id = $1 AND p.kind = 'station' AND ${PLACE_VISITED}
       )
       SELECT v.id, v.name, ST_X(v.geom) AS lon, ST_Y(v.geom) AS lat,
         (SELECT min(f.visited_at) FROM tile_first_visits f
          WHERE f.user_id = $1 AND f.x = v.x AND f.y = v.y
            AND f.mask & (1::bigint << v.bit) <> 0) AS first_visit_at,
         EXISTS (
           SELECT 1 FROM station_link_states s
           WHERE s.place_id = v.id AND s.linked_at IS NOT NULL
         ) AS linked
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
      pendingStations: stations.filter((station) => !station.linked).length,
      stationsVersion: await this.stationsVersion(),
    };
  }

  /** Changes with every import of the stations. Null without stations. */
  async stationsVersion(): Promise<string | null> {
    const [row]: { version: string | null }[] = await this.dataSource.query(
      `SELECT floor(extract(epoch FROM max(updated_at)) * 1000)::bigint::text AS version
       FROM places WHERE kind = 'station'`,
    );
    return row.version;
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
      linked: boolean;
    }[] = await this.dataSource.query(
      `SELECT p.id, p.name, ST_X(p.geom) AS lon, ST_Y(p.geom) AS lat, p.x, p.y, p.bit,
         EXISTS (
           SELECT 1 FROM user_tiles u
           WHERE u.user_id = $1 AND u.x = p.x AND u.y = p.y AND ${PLACE_VISITED}
         ) AS visited,
         (SELECT min(f.visited_at) FROM tile_first_visits f
          WHERE f.user_id = $1 AND f.x = p.x AND f.y = p.y
            AND f.mask & (1::bigint << p.bit) <> 0) AS first_visit_at,
         EXISTS (
           SELECT 1 FROM station_link_states s
           WHERE s.place_id = p.id AND s.linked_at IS NOT NULL
         ) AS linked
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
    }[] = station.linked
      ? await this.dataSource.query(
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
        )
      : [];
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
      neighbors: station.linked
        ? neighbors.map((neighbor) => ({
            id: neighbor.id,
            name: neighbor.name,
            lon: neighbor.lon,
            lat: neighbor.lat,
            lengthM: Math.round(neighbor.length_m),
            visited: neighbor.visited,
          }))
        : null,
    };
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
}

import type { DataSource } from 'typeorm';
import { OverpassClient } from '../overpass/overpass-client';
import {
  type OsmStation,
  parseStations,
  stationsQuery,
} from '../overpass/overpass-queries';
import { SNAP_MAX_M } from '../rail-graph';
import { placeTile } from '../station-tile';

/** Below this, the download is considered incomplete and nothing is replaced. */
const MIN_STATIONS = 50_000;
/** The world is read by bands of longitude: one query for all of it takes too long. */
const BAND_DEG = 45;
const INSERT_BATCH = 5_000;

/** Every train station of OpenStreetMap, read band by band. */
export async function readOsmStations(
  client = new OverpassClient(),
): Promise<OsmStation[]> {
  const stations = new Map<number, OsmStation>();
  for (let west = -180; west < 180; west += BAND_DEG) {
    console.log(`Reading the stations from ${west}° to ${west + BAND_DEG}°…`);
    const csv = await client.query(
      stationsQuery([-90, west, 90, west + BAND_DEG]),
    );
    for (const station of parseStations(csv)) {
      stations.set(station.id, station);
    }
  }
  return [...stations.values()];
}

/**
 * Imports the train stations of OpenStreetMap, replacing the previous
 * ones. The links of the stations moved, added or removed, and of their
 * neighbors, are found again by the worker. `dataSource` must be
 * initialized.
 */
export async function importStations(dataSource: DataSource): Promise<void> {
  const stations = await readOsmStations();
  if (stations.length < MIN_STATIONS) {
    throw new Error(
      `Only ${stations.length} stations read from OpenStreetMap: nothing imported`,
    );
  }

  await dataSource.transaction(async (manager) => {
    await manager.query(
      `CREATE TEMP TABLE imported_stations (
         osm_id bigint PRIMARY KEY, name text, geom geometry(Point, 4326),
         x integer, y integer, bit smallint
       ) ON COMMIT DROP`,
    );
    for (let i = 0; i < stations.length; i += INSERT_BATCH) {
      const batch = stations.slice(i, i + INSERT_BATCH);
      const tiles = batch.map((station) => placeTile(station.lon, station.lat));
      await manager.query(
        `INSERT INTO imported_stations
         SELECT id, name, ST_SetSRID(ST_MakePoint(lon, lat), 4326), x, y, bit
         FROM unnest($1::bigint[], $2::text[], $3::float8[], $4::float8[],
           $5::int[], $6::int[], $7::int[]) AS s(id, name, lon, lat, x, y, bit)`,
        [
          batch.map((station) => station.id),
          batch.map((station) => station.name),
          batch.map((station) => station.lon),
          batch.map((station) => station.lat),
          tiles.map((tile) => tile.x),
          tiles.map((tile) => tile.y),
          tiles.map((tile) => tile.bit),
        ],
      );
    }

    // Stations removed or moved, and the stations added: the links around
    // them may change.
    await manager.query(
      `CREATE TEMP TABLE changed_stations ON COMMIT DROP AS
       SELECT p.id, p.geom FROM places p
       LEFT JOIN imported_stations i ON i.osm_id = p.osm_id
       WHERE p.kind = 'station' AND p.osm_type = 'n'
         AND (i.osm_id IS NULL OR NOT ST_Equals(i.geom, p.geom))
       UNION ALL
       SELECT NULL, i.geom FROM imported_stations i
       WHERE NOT EXISTS (
         SELECT 1 FROM places p
         WHERE p.osm_type = 'n' AND p.osm_id = i.osm_id
       )`,
    );
    const [{ links }]: { links: number }[] = await manager.query(
      `WITH stale AS (
         SELECT l.id, l.station_a, l.station_b FROM rail_links l
         WHERE EXISTS (
           SELECT 1 FROM changed_stations c
           WHERE c.id IN (l.station_a, l.station_b)
             OR ST_DWithin(l.geom::geography, c.geom::geography, ${SNAP_MAX_M})
         )
       ),
       reset AS (
         UPDATE station_link_states s SET checked_at = NULL, linked_at = NULL
         WHERE s.place_id IN (SELECT station_a FROM stale UNION SELECT station_b FROM stale)
           OR s.place_id IN (SELECT id FROM changed_stations WHERE id IS NOT NULL)
       ),
       deleted AS (
         DELETE FROM rail_links WHERE id IN (SELECT id FROM stale) RETURNING 1
       )
       SELECT count(*)::int AS links FROM deleted`,
    );
    const [{ removed }]: { removed: number }[] = await manager.query(
      `WITH deleted AS (
         DELETE FROM places p
         WHERE p.kind = 'station' AND p.osm_type = 'n' AND NOT EXISTS (
           SELECT 1 FROM imported_stations i WHERE i.osm_id = p.osm_id
         )
         RETURNING 1
       )
       SELECT count(*)::int AS removed FROM deleted`,
    );
    const [{ upserted }]: { upserted: number }[] = await manager.query(
      `WITH upserted AS (
         INSERT INTO places (kind, osm_type, osm_id, name, geom, x, y, bit)
         SELECT 'station', 'n', osm_id, name, geom, x, y, bit FROM imported_stations
         ON CONFLICT (osm_type, osm_id) DO UPDATE SET
           name = excluded.name, geom = excluded.geom,
           x = excluded.x, y = excluded.y, bit = excluded.bit, updated_at = now()
         WHERE places.name IS DISTINCT FROM excluded.name
           OR NOT ST_Equals(places.geom, excluded.geom)
         RETURNING 1
       )
       SELECT count(*)::int AS upserted FROM upserted`,
    );
    console.log(
      `${stations.length} stations imported: ${upserted} added or changed, ${removed} removed, ${links} links to find again.`,
    );
  });
}

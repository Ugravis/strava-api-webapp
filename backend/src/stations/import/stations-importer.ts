import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import type { DataSource, EntityManager } from 'typeorm';
import { placeTile } from '../station-tile';
import { parseOplLine } from './osm-opl';
import { type RailwayData, RailwayDataBuilder } from './railway-data';
import type { StationExclusion } from './railway-rules';
import { type NetworkLink, RailwayNetwork } from './railway-network';

/** Below this, the extract is considered incomplete and nothing is replaced. */
const MIN_STATIONS = 1_000;
const INSERT_BATCH = 5_000;
/** Examples kept in the report for each list. */
const REPORT_SAMPLES = 300;
/** A station with more neighbors than this is listed in the report, to be checked. */
const MANY_NEIGHBORS = 6;

/**
 * Objects kept from an OSM extract: the stations, the tracks, the passenger
 * train routes and the stop areas, with the objects they reference.
 */
const OSMIUM_FILTERS = [
  'n/railway=station,halt',
  'w/railway=rail,narrow_gauge,preserved',
  'r/route=train',
  'r/public_transport=stop_area',
];

interface StationSample {
  osmId: number;
  name: string | null;
  lon: number;
  lat: number;
}

/** What an import found, shown on the admin page. */
export interface RailwayImportReport {
  source: string;
  candidates: number;
  kept: number;
  /** Kept stations served by no route, but beside a track serving the stations nearby. */
  servedByTrack: number;
  excluded: Record<StationExclusion, number>;
  /** Examples of excluded stations, by reason. */
  excludedSamples: Record<StationExclusion, StationSample[]>;
  /** Kept stations without any passenger track nearby: never linked. */
  isolated: { count: number; samples: StationSample[] };
  links: number;
  networkKm: number;
  /** Links rejected as longer than a train would go, the worst first. */
  detours: {
    count: number;
    samples: {
      a: StationSample;
      b: StationSample;
      lengthKm: number;
      straightKm: number;
    }[];
  };
  /** Links dropped as redundant with two links through a third station, the longest first. */
  redundant: {
    count: number;
    samples: {
      a: StationSample;
      b: StationSample;
      via: StationSample;
      lengthKm: number;
    }[];
  };
  /** Stations with many neighbors, the most first. */
  manyNeighbors: (StationSample & { neighbors: number })[];
  /** Per country: kept stations and network length. */
  countries: { code: string; stations: number; networkKm: number }[];
  durationsS: Record<string, number>;
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

/**
 * The railway extract of an OSM file, written next to it by osmium once
 * and reused while newer than the file.
 */
async function railwayExtract(source: string): Promise<string> {
  const dir = join(dirname(source), 'derived');
  mkdirSync(dir, { recursive: true });
  const extract = join(dir, `railway-${basename(source)}`);
  if (
    existsSync(extract) &&
    statSync(extract).mtimeMs > statSync(source).mtimeMs
  ) {
    console.log(`Reusing ${extract}`);
    return extract;
  }
  console.log(`Extracting the railway of ${source} into ${extract}…`);
  // Written aside then renamed: an interrupted extraction is never reused.
  const partial = join(dir, `partial-${basename(source)}`);
  await run('osmium', [
    'tags-filter',
    source,
    ...OSMIUM_FILTERS,
    '-o',
    partial,
    '-f',
    'pbf',
    '--overwrite',
    '--progress',
  ]);
  renameSync(partial, extract);
  return extract;
}

/** Reads a railway extract through `osmium cat` as OPL. */
async function readRailway(extract: string): Promise<RailwayData> {
  const builder = new RailwayDataBuilder();
  const child = spawn(
    'osmium',
    ['cat', extract, '-f', 'opl,add_metadata=false'],
    {
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  const closed = new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`osmium cat exited with ${code}`)),
    );
  });
  let objects = 0;
  for await (const line of createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  })) {
    const object = parseOplLine(line);
    if (!object) continue;
    builder.add(object);
    if (++objects % 5_000_000 === 0)
      console.log(`${objects / 1_000_000} M objects read…`);
  }
  await closed;
  return builder.finish();
}

/**
 * Imports the train stations and the links between them from an OSM file
 * (the planet or any extract): osmium keeps its railway, then the whole
 * network is walked in memory. The stations keep their ids from one import
 * to the next; the links are replaced. `dataSource` must be initialized.
 */
export async function importStations(
  dataSource: DataSource,
  source: string,
): Promise<void> {
  const durationsS: Record<string, number> = {};
  const timed = async <T>(step: string, work: () => Promise<T>): Promise<T> => {
    const startedAt = Date.now();
    const result = await work();
    durationsS[step] = Math.round((Date.now() - startedAt) / 1000);
    console.log(`${step}: ${durationsS[step]} s`);
    return result;
  };

  const extract = await timed('extract', () => railwayExtract(source));
  const data = await timed('read', () => readRailway(extract));
  const kept = data.stations.flatMap((station, index) =>
    station.exclusion === null ? [index] : [],
  );
  console.log(
    `${data.nodes.size} nodes, ${data.tracks.count} tracks, ${data.stations.length} candidate stations, ${kept.length} kept`,
  );
  if (kept.length < MIN_STATIONS) {
    throw new Error(
      `Only ${kept.length} stations kept from ${source}: nothing imported`,
    );
  }
  const result = await timed('link', () =>
    Promise.resolve(new RailwayNetwork(data).linkAll()),
  );
  console.log(
    `${result.links.length} links, ${result.detours.length} detours rejected, ${result.redundant.length} redundant`,
  );

  const sample = (index: number): StationSample => {
    const { osmId, name, point } = data.stations[index];
    return { osmId, name, lon: point[0], lat: point[1] };
  };
  const excludedSamples = {
    not_train: [],
    closed: [],
    not_served: [],
  } as Record<StationExclusion, StationSample[]>;
  const excluded = { not_train: 0, closed: 0, not_served: 0 } as Record<
    StationExclusion,
    number
  >;
  data.stations.forEach((station, index) => {
    if (!station.exclusion) return;
    excluded[station.exclusion]++;
    if (excludedSamples[station.exclusion].length < REPORT_SAMPLES) {
      excludedSamples[station.exclusion].push(sample(index));
    }
  });
  const neighbors = new Map<number, number>();
  for (const { a, b } of result.links) {
    neighbors.set(a, (neighbors.get(a) ?? 0) + 1);
    neighbors.set(b, (neighbors.get(b) ?? 0) + 1);
  }

  await timed('save', () =>
    dataSource.transaction(async (manager) => {
      await saveStations(manager, data, kept);
      await saveLinks(manager, data, result.links);
    }),
  );
  await timed('countries', () => splitByCountry(dataSource));

  const countries: { code: string; stations: number; network_km: number }[] =
    await dataSource.query(
      `WITH stations AS (
         -- One spatial join for all the countries, through the index of the parts.
         SELECT cp.country_code AS code, count(DISTINCT p.id)::int AS stations
         FROM places p
         JOIN country_parts cp ON ST_Intersects(cp.geom, ST_Transform(p.geom, 3857))
         WHERE p.kind = 'station'
         GROUP BY cp.country_code
       ), network AS (
         SELECT country_code AS code, round(sum(length_m) / 1000)::int AS network_km
         FROM rail_link_countries
         GROUP BY country_code
       )
       SELECT n.code, coalesce(s.stations, 0) AS stations, n.network_km
       FROM network n
       LEFT JOIN stations s ON s.code = n.code
       ORDER BY n.network_km DESC`,
    );
  const report: RailwayImportReport = {
    source: basename(source),
    candidates: data.stations.length,
    kept: kept.length,
    servedByTrack: kept.filter(
      (index) => data.stations[index].servedBy === 'track',
    ).length,
    excluded,
    excludedSamples,
    isolated: {
      count: result.isolated.length,
      samples: result.isolated.slice(0, REPORT_SAMPLES).map(sample),
    },
    links: result.links.length,
    networkKm: Math.round(
      result.links.reduce((total, link) => total + link.lengthM, 0) / 1000,
    ),
    redundant: {
      count: result.redundant.length,
      samples: result.redundant
        .slice(0, REPORT_SAMPLES)
        .map(({ a, b, via, lengthM }) => ({
          a: sample(a),
          b: sample(b),
          via: sample(via),
          lengthKm: Math.round(lengthM / 100) / 10,
        })),
    },
    detours: {
      count: result.detours.length,
      samples: [...result.detours]
        .sort((p, q) => q.lengthM / q.straightM - p.lengthM / p.straightM)
        .slice(0, REPORT_SAMPLES)
        .map(({ a, b, lengthM, straightM }) => ({
          a: sample(a),
          b: sample(b),
          lengthKm: Math.round(lengthM / 100) / 10,
          straightKm: Math.round(straightM / 100) / 10,
        })),
    },
    manyNeighbors: [...neighbors]
      .filter(([, count]) => count > MANY_NEIGHBORS)
      .sort((p, q) => q[1] - p[1])
      .slice(0, REPORT_SAMPLES)
      .map(([index, count]) => ({ ...sample(index), neighbors: count })),
    countries: countries.map(({ code, stations, network_km }) => ({
      code,
      stations,
      networkKm: network_km,
    })),
    durationsS,
  };
  await dataSource.query(
    `INSERT INTO railway_imports (source, report) VALUES ($1, $2)`,
    [basename(source), JSON.stringify(report)],
  );
  console.log(
    `Imported: ${kept.length} stations, ${result.links.length} links, ${report.networkKm} km.`,
  );
}

/** Upserts the kept stations by OSM id, so that their ids stay, and removes the others. */
async function saveStations(
  manager: EntityManager,
  data: RailwayData,
  kept: number[],
): Promise<void> {
  await manager.query(
    `CREATE TEMP TABLE imported_stations (
       osm_id bigint PRIMARY KEY, name text, geom geometry(Point, 4326), x integer, y integer, bit smallint
     ) ON COMMIT DROP`,
  );
  for (let i = 0; i < kept.length; i += INSERT_BATCH) {
    const batch = kept
      .slice(i, i + INSERT_BATCH)
      .map((index) => data.stations[index]);
    const tiles = batch.map(({ point }) => placeTile(point[0], point[1]));
    await manager.query(
      `INSERT INTO imported_stations
       SELECT id, name, ST_SetSRID(ST_MakePoint(lon, lat), 4326), x, y, bit
       FROM unnest($1::bigint[], $2::text[], $3::float8[], $4::float8[], $5::int[], $6::int[], $7::int[])
         AS s(id, name, lon, lat, x, y, bit)
       ON CONFLICT DO NOTHING`,
      [
        batch.map((station) => station.osmId),
        batch.map((station) => station.name),
        batch.map((station) => station.point[0]),
        batch.map((station) => station.point[1]),
        tiles.map((tile) => tile.x),
        tiles.map((tile) => tile.y),
        tiles.map((tile) => tile.bit),
      ],
    );
  }
  await manager.query(
    `DELETE FROM places p WHERE p.kind = 'station' AND NOT EXISTS (
       SELECT 1 FROM imported_stations i WHERE p.osm_type = 'n' AND i.osm_id = p.osm_id
     )`,
  );
  await manager.query(
    `INSERT INTO places (kind, osm_type, osm_id, name, geom, x, y, bit)
     SELECT 'station', 'n', osm_id, name, geom, x, y, bit FROM imported_stations
     ON CONFLICT (osm_type, osm_id) DO UPDATE SET
       name = excluded.name, geom = excluded.geom, x = excluded.x, y = excluded.y, bit = excluded.bit,
       updated_at = now()
     WHERE places.name IS DISTINCT FROM excluded.name OR NOT ST_Equals(places.geom, excluded.geom)`,
  );
}

/** Replaces every link, the stations given by their OSM ids. */
async function saveLinks(
  manager: EntityManager,
  data: RailwayData,
  links: NetworkLink[],
): Promise<void> {
  await manager.query('DELETE FROM rail_links');
  for (let i = 0; i < links.length; i += INSERT_BATCH) {
    const batch = links.slice(i, i + INSERT_BATCH);
    await manager.query(
      `INSERT INTO rail_links (station_a, station_b, geom, length_m)
       SELECT least(a.id, b.id), greatest(a.id, b.id), ST_GeomFromText(l.wkt, 4326), l.length_m
       FROM unnest($1::bigint[], $2::bigint[], $3::text[], $4::float8[]) AS l(osm_a, osm_b, wkt, length_m)
       JOIN places a ON a.osm_type = 'n' AND a.osm_id = l.osm_a
       JOIN places b ON b.osm_type = 'n' AND b.osm_id = l.osm_b
       ON CONFLICT (station_a, station_b) DO NOTHING`,
      [
        batch.map((link) => data.stations[link.a].osmId),
        batch.map((link) => data.stations[link.b].osmId),
        batch.map(
          (link) =>
            `LINESTRING(${link.coords.map(([lon, lat]) => `${lon} ${lat}`).join(',')})`,
        ),
        batch.map((link) => link.lengthM),
      ],
    );
  }
}

/**
 * Splits the length of each link between the countries it crosses, in
 * proportion of its length in each, for the share of the network of a
 * country.
 */
async function splitByCountry(dataSource: DataSource): Promise<void> {
  await dataSource.query('DELETE FROM rail_link_countries');
  await dataSource.query(
    `INSERT INTO rail_link_countries (link_id, country_code, length_m)
     SELECT l.id, p.country_code,
       l.length_m * least(1, sum(ST_Length(ST_Intersection(m.geom, p.geom))) / nullif(ST_Length(m.geom), 0))
     FROM rail_links l
     CROSS JOIN LATERAL (SELECT ST_Transform(l.geom, 3857) AS geom) m
     JOIN country_parts p ON ST_Intersects(p.geom, m.geom)
     GROUP BY l.id, l.length_m, m.geom, p.country_code`,
  );
}

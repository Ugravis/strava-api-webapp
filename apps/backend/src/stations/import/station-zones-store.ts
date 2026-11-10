import type { DataSource, QueryRunner } from 'typeorm';
import { SUBTILE_ZOOM, TILE_ZOOM } from '../../tiles/tile-grid';
import type { Point, RailwayData } from './railway-data';
import type { ZoneInput, ZoneSource } from './station-zones';

const BATCH = 500;
const SHIFT = SUBTILE_ZOOM - TILE_ZOOM;
const SIDE = 2 ** SHIFT;
/** Web Mercator: half the world width and the side of a small tile, in metres. */
const HALF_WORLD = 20037508.342789244;
const TILE_SIZE = (2 * HALF_WORLD) / 2 ** SUBTILE_ZOOM;

/** Footprint: platforms (lines) widened by this on each side, flat ends, to cover their tracks. */
const PLATFORM_REACH_M = 10;
/** Footprint: gaps narrower than twice this are closed. */
const CLOSING_M = 8;
/** Footprint: grown by this once closed. */
const PADDING_M = 2;
/** A group of platforms becomes its oriented rectangle when that covers at most this much more than its band… */
const BLOCK_SLACK = 1.3;
/** …else its convex hull at most this much more (a fan), else its band (a curve). */
const FAN_SLACK = 1.8;
/** Footprint parts smaller than this share of the largest are dropped. */
const CRUMB_SHARE = 0.1;
/** Footprint simplification, in metres. */
const SIMPLIFY_M = 0.5;
/** Tracks are buffered by this, a zero-width line touching no tile envelope area. */
const RAILS_BUFFER_M = 1;

const MITRE = 'join=mitre mitre_limit=3';

export interface ZoneReport {
  sources: Record<ZoneSource, number>;
  tiles: number;
}

const round = ([lon, lat]: Point): Point => [
  Math.round(lon * 1e7) / 1e7,
  Math.round(lat * 1e7) / 1e7,
];
const lines = (parts: Point[][]) => parts.map((part) => part.map(round));

/** GeoJSON inputs of a zone, null where it has none. */
export function zoneGeoJson(zone: ZoneInput): {
  clusters: string | null;
  buildings: string | null;
  rails: string | null;
} {
  const osm = zone.source === 'osm';
  return {
    clusters:
      osm && zone.clusters.length > 0
        ? JSON.stringify({
            type: 'GeometryCollection',
            geometries: zone.clusters.map((group) => ({
              type: 'MultiLineString',
              coordinates: lines(group),
            })),
          })
        : null,
    buildings:
      osm && zone.buildings.length > 0
        ? JSON.stringify({
            type: 'MultiPolygon',
            coordinates: zone.buildings.map((ring) => [ring.map(round)]),
          })
        : null,
    rails:
      zone.rails.length > 0
        ? JSON.stringify({
            type: 'MultiLineString',
            coordinates: lines(zone.rails),
          })
        : null,
  };
}

/** The UTM zone of a point, as an SRID: metric projection valid worldwide. */
const UTM_SRID = `(CASE WHEN ST_Y(p.geom) >= 0 THEN 32600 ELSE 32700 END
  + least(60, floor((ST_X(p.geom) + 180) / 6)::int + 1))`;

/**
 * Footprint and zone of a batch of stations, in their UTM zone: each group
 * of platforms becomes a block (its band, oriented rectangle or hull),
 * joined to the buildings, gaps closed, holes filled, crumbs dropped. The
 * source falls back to the tracks, then to the point, when a shape is empty.
 * Every step is materialized: inlined, Postgres would compute a shape again
 * at each of its uses, many times over.
 */
const SHAPES = `INSERT INTO zone_shapes (place_id, source, footprint, zone)
WITH m AS MATERIALIZED (
  SELECT p.id, s.srid,
    ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(i.clusters), 4326), s.srid) AS clusters,
    ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(i.buildings), 4326), s.srid) AS buildings,
    ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(i.rails), 4326), s.srid) AS rails
  FROM unnest($1::bigint[], $2::text[], $3::text[], $4::text[]) AS i(osm_id, clusters, buildings, rails)
  JOIN places p ON p.osm_type = 'n' AND p.osm_id = i.osm_id
  CROSS JOIN LATERAL (SELECT ${UTM_SRID} AS srid) AS s
),
f AS MATERIALIZED (
  SELECT m.id, m.srid, m.rails, (
      SELECT ST_Union(ARRAY(
        SELECT CASE
          WHEN ST_Area(ST_OrientedEnvelope(band)) <= ${BLOCK_SLACK} * ST_Area(band) THEN ST_OrientedEnvelope(band)
          WHEN ST_Area(ST_ConvexHull(band)) <= ${FAN_SLACK} * ST_Area(band) THEN ST_ConvexHull(band)
          ELSE band END
        FROM (
          SELECT ST_Buffer(ST_Buffer(
            ST_Buffer(ST_GeometryN(m.clusters, g), ${PLATFORM_REACH_M}, 'endcap=flat ${MITRE}'),
            ${CLOSING_M}, '${MITRE}'), -${CLOSING_M}, '${MITRE}') AS band
          FROM generate_series(1, ST_NumGeometries(m.clusters)) AS g
          OFFSET 0
        ) AS bands
        WHERE NOT ST_IsEmpty(band)
      ))
    ) AS blocks,
    ST_Union(ARRAY(
      SELECT ST_CollectionExtract(ST_MakeValid(d.geom), 3) FROM ST_Dump(m.buildings) AS d
    )) AS buildings
  FROM m
),
b AS MATERIALIZED (
  SELECT f.id, f.srid, f.rails,
    ST_Buffer(ST_Buffer(coalesce(ST_Union(f.blocks, f.buildings), f.blocks, f.buildings),
      ${CLOSING_M}, '${MITRE}'), ${PADDING_M - CLOSING_M}, '${MITRE}') AS blob
  FROM f
),
o AS MATERIALIZED (
  SELECT b.id, b.srid, b.rails, (
    SELECT ST_Union(ARRAY(
      SELECT ST_MakePolygon(ST_ExteriorRing(part.geom))
      FROM ST_Dump(ST_SimplifyPreserveTopology(b.blob, ${SIMPLIFY_M})) AS part
      WHERE ST_Area(part.geom) >= ${CRUMB_SHARE} * (SELECT max(ST_Area(x.geom)) FROM ST_Dump(b.blob) AS x)
    ))
  ) AS footprint
  FROM b
)
SELECT o.id,
  CASE WHEN NOT coalesce(ST_IsEmpty(o.footprint), true) THEN 'osm'
    WHEN o.rails IS NOT NULL THEN 'rails' ELSE 'point' END,
  CASE WHEN NOT coalesce(ST_IsEmpty(o.footprint), true)
    THEN ST_Multi(ST_Transform(o.footprint, 4326)) END,
  CASE WHEN NOT coalesce(ST_IsEmpty(o.footprint), true) THEN ST_Transform(o.footprint, 3857)
    WHEN o.rails IS NOT NULL THEN ST_Transform(ST_Buffer(o.rails, ${RAILS_BUFFER_M}), 3857) END
FROM o`;

/** Small tiles touching each zone, as large tile + bit, like `places.x/y/bit`. */
const TILES = `INSERT INTO zone_tiles (place_id, x, y, bit)
SELECT z.place_id, tx >> ${SHIFT}, ty >> ${SHIFT}, (ty & ${SIDE - 1}) * ${SIDE} + (tx & ${SIDE - 1})
FROM zone_shapes z
CROSS JOIN LATERAL generate_series(
  floor((ST_XMin(z.zone) + ${HALF_WORLD}) / ${TILE_SIZE})::int,
  floor((ST_XMax(z.zone) + ${HALF_WORLD}) / ${TILE_SIZE})::int) AS tx
CROSS JOIN LATERAL generate_series(
  floor((${HALF_WORLD} - ST_YMax(z.zone)) / ${TILE_SIZE})::int,
  floor((${HALF_WORLD} - ST_YMin(z.zone)) / ${TILE_SIZE})::int) AS ty
WHERE z.zone IS NOT NULL AND ST_Intersects(ST_TileEnvelope(${SUBTILE_ZOOM}, tx, ty), z.zone)`;

/**
 * Computes the zone of every kept station and replaces their footprints
 * and `place_tiles`. The shapes are computed outside the transaction, on
 * one connection: only the swap locks the tables. With `onlyComputed`, the
 * other stations keep their zones; else they get the tile of their point.
 */
export async function saveZones(
  dataSource: DataSource,
  data: RailwayData,
  zones: ZoneInput[],
  { onlyComputed = false }: { onlyComputed?: boolean } = {},
): Promise<ZoneReport> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(
      `CREATE TEMP TABLE zone_shapes (
         place_id integer PRIMARY KEY, source varchar(8) NOT NULL,
         footprint geometry(MultiPolygon, 4326), zone geometry
       )`,
    );
    await runner.query(
      `CREATE TEMP TABLE zone_tiles (place_id integer, x integer, y integer, bit smallint)`,
    );
    for (let i = 0; i < zones.length; i += BATCH) {
      await insertShapes(runner, data, zones.slice(i, i + BATCH));
      if ((i / BATCH) % 20 === 0) {
        console.log(
          `Zones: ${Math.min(zones.length, i + BATCH)} / ${zones.length}…`,
        );
      }
    }
    await runner.query(TILES);
    await runner.startTransaction();
    try {
      await swap(runner, onlyComputed);
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    }
    const sources = (await runner.query(
      `SELECT zone_source AS source, count(*)::int AS count FROM places p
         WHERE kind = 'station' ${scope(onlyComputed)} GROUP BY zone_source`,
    )) as { source: ZoneSource; count: number }[];
    const [{ tiles }] = (await runner.query(
      `SELECT count(*)::int AS tiles FROM place_tiles t
       JOIN places p ON p.id = t.place_id WHERE p.kind = 'station' ${scope(onlyComputed)}`,
    )) as { tiles: number }[];
    return {
      sources: {
        osm: 0,
        rails: 0,
        point: 0,
        ...Object.fromEntries(sources.map((s) => [s.source, s.count])),
      },
      tiles,
    };
  } finally {
    await runner.query('DROP TABLE IF EXISTS zone_shapes, zone_tiles');
    await runner.release();
  }
}

async function insertShapes(
  runner: QueryRunner,
  data: RailwayData,
  zones: ZoneInput[],
): Promise<void> {
  const inputs = zones.map(zoneGeoJson);
  await runner.query(SHAPES, [
    zones.map((zone) => data.stations[zone.station].osmId),
    inputs.map((input) => input.clusters),
    inputs.map((input) => input.buildings),
    inputs.map((input) => input.rails),
  ]);
}

/** Restricts a query on the places `p` to those just computed. */
const scope = (onlyComputed: boolean) =>
  onlyComputed ? 'AND p.id IN (SELECT place_id FROM zone_shapes)' : '';

/** Replaces the footprints and tiles of the stations; a station without zone keeps its point tile. */
async function swap(runner: QueryRunner, onlyComputed: boolean): Promise<void> {
  await runner.query(
    `UPDATE places p SET zone_source = coalesce(z.source, 'point'), footprint = z.footprint, updated_at = now()
     FROM places q LEFT JOIN zone_shapes z ON z.place_id = q.id
     WHERE q.id = p.id AND p.kind = 'station'
       AND (p.zone_source IS DISTINCT FROM coalesce(z.source, 'point')
         OR NOT coalesce(ST_Equals(p.footprint, z.footprint), p.footprint IS NULL AND z.footprint IS NULL))
       ${scope(onlyComputed)}`,
  );
  await runner.query(
    `DELETE FROM place_tiles t USING places p WHERE p.id = t.place_id AND p.kind = 'station' ${scope(onlyComputed)}`,
  );
  await runner.query(
    `INSERT INTO place_tiles (place_id, x, y, bit)
     SELECT DISTINCT place_id, x, y, bit FROM zone_tiles
     UNION
     SELECT p.id, p.x, p.y, p.bit FROM places p
     WHERE p.kind = 'station' AND NOT EXISTS (SELECT 1 FROM zone_tiles z WHERE z.place_id = p.id)
       ${scope(onlyComputed)}`,
  );
}

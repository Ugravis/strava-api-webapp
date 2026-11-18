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

/** Footprint: platforms drawn as lines are this wide, flat ends. */
const PLATFORM_WIDTH_M = 8;
/** Footprint: gaps between the platforms of a level narrower than twice this are filled (the tracks between them). */
const PLATFORM_CLOSING_M = 10;
/** Footprint: a track this close to the platforms of its level runs along them… */
const TRACK_ALONG_M = 6;
/** …and is taken in with this margin on each side, a little more than a platform. */
const TRACK_MARGIN_M = 12;
/** Footprint: spikes narrower than twice this, left by the square ends of fanning tracks, are trimmed. */
const SPIKE_OPENING_M = 6;
/** Footprint: gaps narrower than twice this are closed between the blocks and the buildings… */
const CLOSING_M = 15;
/** …then the shape is grown by this. */
const PADDING_M = 2;
/** Footprint parts smaller than this share of the largest are dropped. */
const CRUMB_SHARE = 0.1;
/** Footprint simplification, in metres. */
const SIMPLIFY_M = 0.5;

const MITRE = 'join=mitre mitre_limit=5';

export interface ZoneReport {
  sources: Record<ZoneSource, number>;
  tiles: number;
}

const round = ([lon, lat]: Point): Point => [
  Math.round(lon * 1e7) / 1e7,
  Math.round(lat * 1e7) / 1e7,
];
const isRing = (part: Point[]): boolean =>
  part.length >= 4 &&
  part[0][0] === part[part.length - 1][0] &&
  part[0][1] === part[part.length - 1][1];
const multiLine = (parts: Point[][]): string | null =>
  parts.length > 0
    ? JSON.stringify({
        type: 'MultiLineString',
        coordinates: parts.map((part) => part.map(round)),
      })
    : null;

/** Platforms of a level: rings as areas, lines as lines. */
function platformGeoJson(parts: Point[][]): string | null {
  const lines = parts.filter((part) => part.length >= 2);
  if (lines.length === 0) return null;
  return JSON.stringify({
    type: 'GeometryCollection',
    geometries: lines.map((part) =>
      isRing(part)
        ? { type: 'Polygon', coordinates: [part.map(round)] }
        : { type: 'LineString', coordinates: part.map(round) },
    ),
  });
}

/** GeoJSON inputs of a zone, null where it has none. */
export function zoneGeoJson(zone: ZoneInput): {
  surface: string | null;
  below: string | null;
  buildings: string | null;
  rails: string | null;
  tracks: string | null;
  tunnels: string | null;
} {
  return {
    surface: platformGeoJson(zone.levels[0]),
    below: platformGeoJson(zone.levels[1]),
    buildings:
      zone.buildings.length > 0
        ? JSON.stringify({
            type: 'MultiPolygon',
            coordinates: zone.buildings.map((ring) => [ring.map(round)]),
          })
        : null,
    rails: multiLine(zone.rails),
    tracks: multiLine(zone.tracks),
    tunnels: multiLine(zone.tunnels),
  };
}

/** The UTM zone of a point, as an SRID: metric projection valid worldwide. */
const UTM_SRID = `(CASE WHEN ST_Y(p.geom) >= 0 THEN 32600 ELSE 32700 END
  + least(60, floor((ST_X(p.geom) + 180) / 6)::int + 1))`;

const metric = (geojson: string) =>
  `ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), s.srid)`;
/** Platforms as areas: those drawn as lines get PLATFORM_WIDTH_M, flat ends. */
const areas = (g: string) => `ST_Union(ARRAY(
    SELECT CASE ST_Dimension(d.geom) WHEN 2 THEN ST_CollectionExtract(ST_MakeValid(d.geom), 3)
      ELSE ST_Buffer(d.geom, ${PLATFORM_WIDTH_M / 2}, 'endcap=flat ${MITRE}') END
    FROM ST_Dump(${g}) AS d WHERE ST_Dimension(d.geom) > 0
  ))`;
/** A closing (grown then shrunk), straight edges and square corners kept. */
const closing = (g: string, m: number) =>
  `ST_Buffer(ST_Buffer(${g}, ${m}, '${MITRE}'), -${m}, '${MITRE}')`;
/** An opening (shrunk then grown): spikes trimmed. */
const opening = (g: string, m: number) =>
  `ST_Buffer(ST_Buffer(${g}, -${m}, '${MITRE}'), ${m}, '${MITRE}')`;
/** `shape` with the tracks inside `within` taken in, TRACK_MARGIN_M on each side, flat ends. */
const along = (shape: string, tracks: string, within: string) =>
  `ST_Union(${shape}, coalesce(ST_Buffer(
    ST_CollectionExtract(ST_Intersection(${tracks}, ${within}), 2),
    ${TRACK_MARGIN_M}, 'endcap=flat ${MITRE}'), ${shape}))`;
/** The union of two shapes, either of which may be null. */
const union = (a: string, b: string) =>
  `coalesce(ST_Union(${a}, ${b}), ${a}, ${b})`;
/** A shape closed, grown by PADDING_M, simplified, without holes nor crumbs. */
const solid = (g: string) => `(
    SELECT ST_Union(ARRAY(
      SELECT ST_MakePolygon(ST_ExteriorRing(part.geom))
      FROM ST_Dump(ST_SimplifyPreserveTopology(x.blob, ${SIMPLIFY_M})) AS part
      WHERE ST_Area(part.geom) >= ${CRUMB_SHARE} * (SELECT max(ST_Area(y.geom)) FROM ST_Dump(x.blob) AS y)
    ))
    FROM (SELECT ST_Buffer(ST_Buffer(${g}, ${CLOSING_M}, '${MITRE}'), ${PADDING_M - CLOSING_M}, '${MITRE}') AS blob) AS x
  )`;

/**
 * Footprint and zone of a batch of stations, in their UTM zone, as Apple
 * Plans draws a station: the platforms of each level, the tracks between
 * them filled; every track along them taken in with a margin on each side,
 * then every track inside the shape so grown (cut to it: the tails do not
 * grow); spikes trimmed; joined to the surface buildings, gaps closed,
 * holes filled, crumbs dropped. Surface platforms take the tracks in the
 * open, underground ones every track: a track may change its tags along a
 * platform. Without platforms nor buildings, the tracks walked from the
 * point get the same margins; without them either, the tile of the point.
 * Every step is materialized: inlined, Postgres would compute a shape again
 * at each of its uses, many times over.
 */
const SHAPES = `INSERT INTO zone_shapes (place_id, source, footprint, zone)
WITH m AS MATERIALIZED (
  SELECT p.id, s.srid,
    ${areas(metric('i.surface'))} AS surface,
    ${areas(metric('i.below'))} AS below,
    ST_Union(ARRAY(
      SELECT ST_CollectionExtract(ST_MakeValid(d.geom), 3) FROM ST_Dump(${metric('i.buildings')}) AS d
    )) AS buildings,
    ${metric('i.rails')} AS rails,
    ${metric('i.tracks')} AS open_tracks,
    ${union(metric('i.tracks'), metric('i.tunnels'))} AS all_tracks
  FROM unnest($1::bigint[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
    AS i(osm_id, surface, below, buildings, rails, tracks, tunnels, osm_type)
  JOIN places p ON p.osm_type = i.osm_type AND p.osm_id = i.osm_id
  CROSS JOIN LATERAL (SELECT ${UTM_SRID} AS srid) AS s
),
c AS MATERIALIZED (
  SELECT m.*,
    ${closing('m.surface', PLATFORM_CLOSING_M)} AS surface_closed,
    ${closing('m.below', PLATFORM_CLOSING_M)} AS below_closed,
    ST_Buffer(m.rails, ${TRACK_MARGIN_M}, 'endcap=flat ${MITRE}') AS walked
  FROM m
),
g1 AS MATERIALIZED (
  SELECT c.id, c.srid, c.buildings, c.rails, c.open_tracks, c.all_tracks, c.walked,
    ${along('c.surface_closed', 'c.open_tracks', `ST_Buffer(c.surface_closed, ${TRACK_ALONG_M}, '${MITRE}')`)} AS surface,
    ${along('c.below_closed', 'c.all_tracks', `ST_Buffer(c.below_closed, ${TRACK_ALONG_M}, '${MITRE}')`)} AS below
  FROM c
),
g2 AS MATERIALIZED (
  SELECT g1.id, g1.srid, g1.buildings, g1.rails,
    ${opening(along('g1.surface', 'g1.open_tracks', 'g1.surface'), SPIKE_OPENING_M)} AS surface,
    ${opening(along('g1.below', 'g1.all_tracks', 'g1.below'), SPIKE_OPENING_M)} AS below,
    ${opening(along('g1.walked', 'g1.all_tracks', 'g1.walked'), SPIKE_OPENING_M)} AS rail_block
  FROM g1
),
o AS MATERIALIZED (
  SELECT g2.id, g2.srid, g2.rails, g2.rail_block,
    ${solid(union(union('g2.surface', 'g2.below'), 'g2.buildings'))} AS footprint
  FROM g2
),
r AS MATERIALIZED (
  SELECT o.id, o.footprint, o.rails,
    CASE WHEN NOT coalesce(ST_IsEmpty(o.footprint), true) THEN NULL
      WHEN o.rail_block IS NOT NULL THEN ${solid('o.rail_block')} END AS rail_shape
  FROM o
)
SELECT r.id,
  CASE WHEN NOT coalesce(ST_IsEmpty(r.footprint), true) THEN 'osm'
    WHEN r.rails IS NOT NULL THEN 'rails' ELSE 'point' END,
  ST_Multi(ST_Transform(s.shape, 4326)),
  ST_Transform(s.shape, 3857)
FROM r
CROSS JOIN LATERAL (
  SELECT CASE WHEN NOT coalesce(ST_IsEmpty(r.footprint), true) THEN r.footprint
    ELSE r.rail_shape END AS shape
) AS s`;

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
    inputs.map((input) => input.surface),
    inputs.map((input) => input.below),
    inputs.map((input) => input.buildings),
    inputs.map((input) => input.rails),
    inputs.map((input) => input.tracks),
    inputs.map((input) => input.tunnels),
    zones.map((zone) => data.stations[zone.station].osmType),
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

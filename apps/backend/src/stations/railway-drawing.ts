import type { EntityManager } from 'typeorm';
import { reachingStations } from './import/railway-network';

/** Tolerance of the simplified links sent to the map, in degrees (about 2 m). */
const LINK_SIMPLIFY_DEG = 0.00002;
/** Tolerance of the simplified ties, in degrees (about 0.5 m): finer, as they are drawn from the zoom where the base map shows the rail itself. */
const TIE_SIMPLIFY_DEG = 0.000005;

/** Two stations linked by the railway, as a map draws it. */
export interface DrawnLink {
  id: number;
  stations: [number, number];
  lengthM: number;
  /** `[lon, lat]` along the tracks, simplified, curving from each station onto them. */
  coords: [number, number][];
}

/** A stretch of railway, with the links drawn running over it. */
export interface DrawnTie {
  linkIds: number[];
  /** `[lon, lat]`, simplified. */
  coords: [number, number][];
}

/**
 * The links matching `where` (over `rail_links`, `$1` its parameter), drawn
 * reaching their stations (`points`, which must hold both ends of each), and
 * the railway under them cut where they diverge, drawn once for their ties.
 */
export async function drawRailway(
  db: Pick<EntityManager, 'query'>,
  where: string,
  param: unknown,
  points: Map<number, [number, number]>,
): Promise<{ links: DrawnLink[]; ties: DrawnTie[] }> {
  const links: {
    id: number;
    station_a: number;
    station_b: number;
    length_m: number;
    geojson: string;
  }[] = await db.query(
    `SELECT id, station_a, station_b, length_m,
       ST_AsGeoJSON(ST_Simplify(geom, ${LINK_SIMPLIFY_DEG}), 6) AS geojson
     FROM rail_links
     WHERE ${where}
     ORDER BY id`,
    [param],
  );
  const linkIds = links.map((link) => link.id);
  const ties: { link_ids: number[]; geojson: string }[] =
    linkIds.length === 0
      ? []
      : await db.query(
          `SELECT link_ids, ST_AsGeoJSON(ST_Simplify(geom, ${TIE_SIMPLIFY_DEG}), 6) AS geojson
           FROM rail_segments
           WHERE link_ids && $1::int[]`,
          [linkIds],
        );
  const drawn = new Set(linkIds);
  const coordsOf = (geojson: string) =>
    (JSON.parse(geojson) as { coordinates: [number, number][] }).coordinates;
  return {
    links: links.map((link) => ({
      id: link.id,
      stations: [link.station_a, link.station_b],
      lengthM: Math.round(link.length_m),
      // Stored along the tracks: drawn curving from each station onto them.
      coords: reachingStations(
        points.get(link.station_a)!,
        points.get(link.station_b)!,
        coordsOf(link.geojson),
      ),
    })),
    ties: ties.map((tie) => ({
      linkIds: tie.link_ids.filter((id) => drawn.has(id)),
      coords: coordsOf(tie.geojson),
    })),
  };
}

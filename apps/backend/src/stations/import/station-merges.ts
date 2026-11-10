import type { DataSource } from 'typeorm';
import { namesRelated, normalizedName } from './railway-data';

/**
 * Two stations whose footprints overlap by at least this share of the
 * smaller one, and whose names are related (`namesRelated`), are the parts
 * of one station mapped apart: the level of a Hauptbahnhof (`Hauptbahnhof
 * (tief)`), a hall of a terminus (`Paris Montparnasse 3 - Vaugirard`). Two
 * stations linked by corridors keep apart (`Magenta`, `Paris Gare du Nord`).
 */
export const FOOTPRINT_MERGE_SHARE = 0.5;
/**
 * …and from this share whatever their names: one footprint within the
 * other is one station named in two languages (`Youb`, `محطة القطار يوب`).
 */
export const FOOTPRINT_WITHIN_SHARE = 0.95;

export interface FootprintPair {
  a: number;
  b: number;
  /** Share of the smaller footprint inside the other. */
  share: number;
}

export interface FootprintStation {
  id: number;
  name: string | null;
  areaM2: number;
  /** Number of train routes stopping at it. */
  routes: number;
}

/**
 * The station each merged station goes into, by id: the groups of
 * overlapping stations go into the one served by the most train routes
 * (Belfort-Montbéliard TGV, not the halt of Meroux within it), then the
 * largest footprint, the shortest name, the smallest id.
 */
export function footprintMerges(
  pairs: FootprintPair[],
  stations: Map<number, FootprintStation>,
): Map<number, number> {
  const parent = new Map<number, number>();
  const root = (id: number): number => {
    let current = id;
    while (parent.has(current)) current = parent.get(current)!;
    return current;
  };
  const rank = (id: number): number[] => {
    const station = stations.get(id)!;
    return [
      -station.routes,
      -station.areaM2,
      station.name?.length ?? Infinity,
      id,
    ];
  };
  const before = (p: number, q: number): boolean => {
    const [a, b] = [rank(p), rank(q)];
    const i = a.findIndex((value, j) => value !== b[j]);
    return i !== -1 && a[i] < b[i];
  };
  for (const { a, b, share } of pairs) {
    const names = [a, b].map((id) => normalizedName(stations.get(id)!.name));
    if (share < FOOTPRINT_WITHIN_SHARE && !namesRelated(names[0], names[1]))
      continue;
    const [ra, rb] = [root(a), root(b)];
    if (ra === rb) continue;
    if (before(ra, rb)) parent.set(rb, ra);
    else parent.set(ra, rb);
  }
  return new Map([...parent.keys()].map((id) => [id, root(id)]));
}

const OVERLAPS = `
  WITH pairs AS MATERIALIZED (
    SELECT a.id AS a, b.id AS b,
           ST_Area(ST_Intersection(a.footprint, b.footprint)::geography) AS shared_m2
    FROM places a
    JOIN places b ON a.id < b.id AND a.footprint && b.footprint
      AND ST_Intersects(a.footprint, b.footprint)
    WHERE a.kind = 'station' AND b.kind = 'station'
      AND a.zone_source = 'osm' AND b.zone_source = 'osm'
  ), areas AS MATERIALIZED (
    SELECT p.id, p.osm_id, p.name, ST_Area(p.footprint::geography) AS area_m2
    FROM places p
    WHERE p.id IN (SELECT a FROM pairs UNION SELECT b FROM pairs)
  )
  SELECT pairs.a, pairs.b,
         pairs.shared_m2 / nullif(least(sa.area_m2, sb.area_m2), 0) AS share,
         sa.osm_id AS osm_a, sa.name AS name_a, sa.area_m2 AS area_a,
         sb.osm_id AS osm_b, sb.name AS name_b, sb.area_m2 AS area_b
  FROM pairs
  JOIN areas sa ON sa.id = pairs.a
  JOIN areas sb ON sb.id = pairs.b
  WHERE pairs.shared_m2 >= $1 * least(sa.area_m2, sb.area_m2)`;

/**
 * Merges the stations whose footprints overlap (`FOOTPRINT_MERGE_SHARE`):
 * the station kept takes the footprint and the small tiles of the others,
 * and their links, the shortest kept between two stations. Returns the
 * number of stations merged. `routes`: the number of train routes of the
 * stations, by OSM id.
 */
export async function mergeOverlappingStations(
  dataSource: DataSource,
  routes: Map<number, number>,
): Promise<number> {
  const rows: {
    a: number;
    b: number;
    share: number | null;
    osm_a: string;
    name_a: string | null;
    area_a: number;
    osm_b: string;
    name_b: string | null;
    area_b: number;
  }[] = await dataSource.query(OVERLAPS, [FOOTPRINT_MERGE_SHARE]);
  const stations = new Map<number, FootprintStation>();
  for (const row of rows) {
    for (const [id, osm, name, areaM2] of [
      [row.a, row.osm_a, row.name_a, row.area_a],
      [row.b, row.osm_b, row.name_b, row.area_b],
    ] as const) {
      stations.set(id, {
        id,
        name,
        areaM2,
        routes: routes.get(Number(osm)) ?? 0,
      });
    }
  }
  const merges = footprintMerges(
    rows.map(({ a, b, share }) => ({ a, b, share: share ?? 0 })),
    stations,
  );
  if (merges.size === 0) return 0;
  await dataSource.transaction(async (manager) => {
    await manager.query(
      `CREATE TEMP TABLE station_merges (old_id integer PRIMARY KEY, new_id integer NOT NULL) ON COMMIT DROP`,
    );
    await manager.query(
      `INSERT INTO station_merges (old_id, new_id)
       SELECT * FROM unnest($1::int[], $2::int[])`,
      [[...merges.keys()], [...merges.values()]],
    );
    await manager.query(
      `UPDATE places p SET footprint = u.footprint, updated_at = now()
       FROM (
         SELECT m.new_id, ST_Multi(ST_Union(o.footprint)) AS footprint
         FROM (SELECT old_id, new_id FROM station_merges
               UNION SELECT DISTINCT new_id, new_id FROM station_merges) m
         JOIN places o ON o.id = m.old_id
         GROUP BY m.new_id
       ) u
       WHERE p.id = u.new_id`,
    );
    await manager.query(
      `INSERT INTO place_tiles (place_id, x, y, bit)
       SELECT m.new_id, t.x, t.y, t.bit
       FROM place_tiles t JOIN station_merges m ON m.old_id = t.place_id
       ON CONFLICT DO NOTHING`,
    );
    await manager.query(
      `INSERT INTO rail_links (station_a, station_b, geom, length_m)
       SELECT DISTINCT ON (least(a, b), greatest(a, b))
              least(a, b), greatest(a, b), geom, length_m
       FROM (
         SELECT coalesce(ma.new_id, l.station_a) AS a,
                coalesce(mb.new_id, l.station_b) AS b, l.geom, l.length_m
         FROM rail_links l
         LEFT JOIN station_merges ma ON ma.old_id = l.station_a
         LEFT JOIN station_merges mb ON mb.old_id = l.station_b
         WHERE ma.old_id IS NOT NULL OR mb.old_id IS NOT NULL
       ) moved
       WHERE a <> b
       ORDER BY least(a, b), greatest(a, b), length_m
       ON CONFLICT (station_a, station_b) DO UPDATE
         SET geom = excluded.geom, length_m = excluded.length_m
         WHERE excluded.length_m < rail_links.length_m`,
    );
    await manager.query(
      `DELETE FROM places p USING station_merges m WHERE p.id = m.old_id`,
    );
  });
  return merges.size;
}

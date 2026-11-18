import type { DataSource } from 'typeorm';

/**
 * The railway generalized for the zoomed-out maps. Its segments are joined
 * into lines ("strokes") where the track runs on straight enough, the
 * straightest continuation first at each junction. Zoomed out, the maps
 * draw every line, merged and simplified, rather than every segment.
 */

/** A segment by its ends: where it starts and ends, and the way it leaves each end. */
export interface SegmentEnds {
  id: number;
  start: [number, number];
  end: [number, number];
  /** Direction from each end into the segment, in radians, the east at 0. */
  startHeading: number;
  endHeading: number;
  lengthM: number;
}

/** Above this bend at a junction, in degrees, two segments make two lines. */
const MAX_DEFLECTION_DEG = 60;
/** Zoom from which the tiles hold the segments themselves, the lines below. */
export const RAIL_DETAIL_ZOOM = 8;
/** Tolerance of the simplified lines, in degrees (about 200 m): finer than a pixel below `RAIL_DETAIL_ZOOM`. */
const STROKE_SIMPLIFY_DEG = 0.002;

/**
 * Ends of segments this close, in metres, meet at one node: the links of
 * the railway stop a little apart at the stations, mostly within a few
 * dozen metres.
 */
const NODE_TOLERANCE_M = 100;
const METRES_PER_DEGREE = 111_320;
/** Side of the cells the nodes are looked for in, in degrees of latitude: at least the tolerance. */
const CELL_DEG = NODE_TOLERANCE_M / METRES_PER_DEGREE;

/** The nodes of the railway, each end of a segment matched with a node within the tolerance. */
class Nodes {
  private readonly cells = new Map<
    string,
    { x: number; y: number; id: number }[]
  >();
  private count = 0;

  /** The node within the tolerance of `point`, a new one when none is. */
  at([x, y]: [number, number]): number {
    const shrink = Math.cos((y * Math.PI) / 180);
    const cx = Math.floor((x * shrink) / CELL_DEG);
    const cy = Math.floor(y / CELL_DEG);
    let best: { id: number; distance: number } | null = null;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const node of this.cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          const distance =
            Math.hypot((node.x - x) * shrink, node.y - y) * METRES_PER_DEGREE;
          if (
            distance <= NODE_TOLERANCE_M &&
            (!best || distance < best.distance)
          )
            best = { id: node.id, distance };
        }
      }
    }
    if (best) return best.id;
    const id = this.count++;
    const key = `${cx},${cy}`;
    this.cells.set(key, [...(this.cells.get(key) ?? []), { x, y, id }]);
    return id;
  }
}

/** How far two segments leaving a node by `a` and `b` bend from running straight on, in degrees: 0 when they leave it opposite ways. */
function deflection(a: number, b: number): number {
  // Angle between the two ways out, from 0 to π.
  const between = Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  return 180 - (between * 180) / Math.PI;
}

/** The lines of the railway, and the node at each end of each segment. */
export interface Strokes {
  /** Lists of indices into the segments, each in order along its line. */
  strokes: number[][];
  /** The node at the end `end` of the segment `index`, at `2 * index + end`. */
  nodeOf: Int32Array;
}

/**
 * The segments joined into lines. At each node, the ends are paired by how
 * straight they run on, the straightest first.
 */
export function buildStrokes(segments: SegmentEnds[]): Strokes {
  const located = new Nodes();
  const nodeOf = new Int32Array(2 * segments.length);
  const nodes = new Map<
    number,
    { segment: number; end: 0 | 1; heading: number }[]
  >();
  segments.forEach((segment, index) => {
    for (const [end, point, heading] of [
      [0, segment.start, segment.startHeading],
      [1, segment.end, segment.endHeading],
    ] as const) {
      const key = located.at(point);
      nodeOf[2 * index + end] = key;
      const ends = nodes.get(key) ?? [];
      ends.push({ segment: index, end, heading });
      nodes.set(key, ends);
    }
  });
  /** The end joined to each end of a segment (`2 * segment + end`). */
  const next = new Map<number, number>();
  for (const ends of nodes.values()) {
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < ends.length; i += 1) {
      for (let j = i + 1; j < ends.length; j += 1) {
        if (ends[i].segment === ends[j].segment) continue;
        const bend = deflection(ends[i].heading, ends[j].heading);
        if (bend <= MAX_DEFLECTION_DEG) pairs.push([bend, i, j]);
      }
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const paired = new Set<number>();
    for (const [, i, j] of pairs) {
      if (paired.has(i) || paired.has(j)) continue;
      paired.add(i).add(j);
      const a = 2 * ends[i].segment + ends[i].end;
      const b = 2 * ends[j].segment + ends[j].end;
      next.set(a, b);
      next.set(b, a);
    }
  }
  const taken = new Uint8Array(segments.length);
  const strokes: number[][] = [];
  /** The segments met leaving `segment` by its end `end`, in order. */
  const walk = (segment: number, end: number): number[] => {
    const met: number[] = [];
    let at = next.get(2 * segment + end);
    while (at !== undefined) {
      const reached = at >> 1;
      if (taken[reached]) break;
      taken[reached] = 1;
      met.push(reached);
      // Out by its other end.
      at = next.get(2 * reached + (1 - (at & 1)));
    }
    return met;
  };
  for (let index = 0; index < segments.length; index += 1) {
    if (taken[index]) continue;
    taken[index] = 1;
    const before = walk(index, 0).reverse();
    strokes.push([...before, index, ...walk(index, 1)]);
  }
  return { strokes, nodeOf };
}

/**
 * Whether each segment of the line `stroke` runs against it, in order: a
 * segment runs along it when it starts where the one before ends.
 */
export function reversals(
  { strokes, nodeOf }: Strokes,
  stroke: number,
): boolean[] {
  const members = strokes[stroke];
  const ends = (segment: number) => [
    nodeOf[2 * segment],
    nodeOf[2 * segment + 1],
  ];
  const reversed: boolean[] = [];
  let at: number | null = null;
  members.forEach((segment, order) => {
    const [start, end] = ends(segment);
    if (at === null) {
      // The first one ends where the next one is met.
      const next = members[order + 1];
      const backwards =
        next !== undefined &&
        ends(next).includes(start) &&
        !ends(next).includes(end);
      reversed.push(backwards);
      at = backwards ? start : end;
      return;
    }
    const backwards = end === at && start !== at;
    reversed.push(backwards);
    at = backwards ? start : end;
  });
  return reversed;
}

/** Direction from `from` to `to`, in radians, the degrees of longitude shrunk with the latitude. */
function heading(from: [number, number], to: [number, number]): number {
  const shrink = Math.cos((from[1] * Math.PI) / 180);
  return Math.atan2(to[1] - from[1], (to[0] - from[0]) * shrink);
}

/** Joins the segments in the database into lines, and stores them simplified for the tiles zoomed out. */
export async function saveStrokes(
  dataSource: DataSource,
): Promise<{ strokes: number }> {
  const rows: {
    id: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    xn: number;
    yn: number;
    xm: number;
    ym: number;
    length_m: number;
  }[] = await dataSource.query(
    `SELECT id,
       ST_X(ST_StartPoint(geom)) AS x0, ST_Y(ST_StartPoint(geom)) AS y0,
       ST_X(ST_PointN(geom, 2)) AS x1, ST_Y(ST_PointN(geom, 2)) AS y1,
       ST_X(ST_EndPoint(geom)) AS xn, ST_Y(ST_EndPoint(geom)) AS yn,
       ST_X(ST_PointN(geom, -2)) AS xm, ST_Y(ST_PointN(geom, -2)) AS ym,
       ST_Length(geom::geography) AS length_m
     FROM rail_segments ORDER BY id`,
  );
  const segments: SegmentEnds[] = rows.map((row) => {
    const start: [number, number] = [row.x0, row.y0];
    const end: [number, number] = [row.xn, row.yn];
    return {
      id: row.id,
      start,
      end,
      startHeading: heading(start, [row.x1, row.y1]),
      endHeading: heading(end, [row.xm, row.ym]),
      lengthM: row.length_m,
    };
  });
  const built = buildStrokes(segments);
  const { strokes } = built;
  const ids: number[] = [];
  const strokeOf: number[] = [];
  const reversedOf: boolean[] = [];
  strokes.forEach((members, stroke) => {
    const reversed = reversals(built, stroke);
    members.forEach((index, order) => {
      ids.push(segments[index].id);
      strokeOf.push(stroke);
      reversedOf.push(reversed[order]);
    });
  });
  await dataSource.transaction(async (manager) => {
    await manager.query('DELETE FROM rail_strokes');
    await manager.query(
      // One piece along the line, its segments in order and the way it runs, over the small gaps between them.
      // Every line, the shortest kept as a stub rather than collapsed away: the railway whole at every zoom.
      `INSERT INTO rail_strokes (geom)
       SELECT ST_Multi(ST_Simplify(ST_MakeLine(array_agg(
           CASE WHEN u.reversed THEN ST_Reverse(s.geom) ELSE s.geom END ORDER BY u.ord)), ${STROKE_SIMPLIFY_DEG}, true))
       FROM unnest($1::int[], $2::int[], $3::boolean[]) WITH ORDINALITY AS u(id, stroke, reversed, ord)
       JOIN rail_segments s ON s.id = u.id
       GROUP BY u.stroke`,
      [ids, strokeOf, reversedOf],
    );
  });
  await dataSource.query('ANALYZE rail_strokes');
  return { strokes: strokes.length };
}

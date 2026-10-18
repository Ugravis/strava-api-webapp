import { metersBetween, tilePosition } from '../tiles/tile-grid';
import type { Bbox, OsmRailWay } from './overpass/overpass-queries';

/** Regions of the railway: slippy-map tiles at zoom 9, about 50 km wide in France. */
export const REGION_ZOOM = 9;
/**
 * The railway of a region is fetched this far beyond its edges: the
 * stations near an edge are snapped with every track around them.
 */
export const REGION_BUFFER_M = 1_000;
/** A station farther than this from any track is linked to none. */
export const SNAP_MAX_M = 400;
/**
 * Besides the nearest track, a station is snapped to the other tracks at
 * most this much farther: the parallel tracks of its line, not another line
 * passing by.
 */
const SNAP_TRACK_GAP_M = 60;
/** A snap point this close to a node is the node itself. */
const SNAP_NODE_M = 1;
/** Beyond this distance along the tracks, the walk gives up without a link. */
export const WALK_MAX_M = 300_000;
/** Degrees of the cells of the index of the segments, about 1 km. */
const GRID_DEG = 0.01;

const METERS_PER_DEGREE = 111_320;

export interface RegionRef {
  x: number;
  y: number;
}

export function regionOf(lon: number, lat: number): RegionRef {
  const [x, y] = tilePosition([lat, lon], REGION_ZOOM);
  const n = 2 ** REGION_ZOOM;
  return {
    x: Math.min(n - 1, Math.max(0, Math.floor(x))),
    y: Math.min(n - 1, Math.max(0, Math.floor(y))),
  };
}

function regionKey({ x, y }: RegionRef): string {
  return `${x}/${y}`;
}

/** Bounds of a region, `bufferM` meters beyond its edges. */
export function regionBbox({ x, y }: RegionRef, bufferM = 0): Bbox {
  const n = 2 ** REGION_ZOOM;
  const lat = (row: number): number =>
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * row) / n))) * 180) / Math.PI;
  const south = lat(y + 1);
  const north = lat(y);
  const dLat = bufferM / METERS_PER_DEGREE;
  const widest = Math.max(Math.abs(south), Math.abs(north));
  const dLon =
    bufferM / (METERS_PER_DEGREE * Math.cos((widest * Math.PI) / 180));
  return [
    Math.max(-90, south - dLat),
    Math.max(-180, (x / n) * 360 - 180 - dLon),
    Math.min(90, north + dLat),
    Math.min(180, ((x + 1) / n) * 360 - 180 + dLon),
  ];
}

/** `[lon, lat]`. */
type Point = [number, number];

export interface GraphStation {
  id: number;
  lon: number;
  lat: number;
}

/** A link found from a station: the railway to the next station, without any station between. */
export interface RailPath {
  from: number;
  to: number;
  lengthM: number;
  /** `[lon, lat]` from the first station to the second, along the tracks. */
  coords: Point[];
}

export interface WalkResult {
  links: RailPath[];
  /**
   * Regions the walk reached without their railway: until they are loaded,
   * the links of the station are not known.
   */
  missing: RegionRef[];
}

/** A station on an edge, `t` the share of the edge from its first node. */
interface Stop {
  station: number;
  t: number;
  point: Point;
}

interface Edge {
  to: number;
  length: number;
  /** Sorted by `t`, from the node holding the edge. */
  stops: Stop[];
}

interface GraphNode {
  point: Point;
  edges: Edge[];
  /** Stations snapped to the node itself. */
  stations: number[];
}

interface Segment {
  way: number;
  a: number;
  b: number;
}

/** Where a station meets a track: a node, or a point of the edge `a → b`. */
type Snap =
  { node: number } | { a: number; b: number; t: number; point: Point };

/** How the walk reached a node: from another node, or from the start. */
type Predecessor = { prev: number } | { start: Point | null };

interface Arrival {
  lengthM: number;
  /** Last node before the station; null when it lies on an edge of the start. */
  end: number | null;
  start: Point | null;
  point: Point | null;
}

/**
 * Railway graph of the loaded regions: the nodes of the OSM ways and the
 * tracks between them, with the stations snapped to them. A walk from a
 * station stops at every station it meets, so each station reached is a
 * neighbor: connected by the tracks without any station between.
 */
export class RailGraph {
  private readonly nodes = new Map<number, GraphNode>();
  private readonly ways = new Set<number>();
  private readonly cells = new Map<string, Segment[]>();
  private readonly stations = new Map<number, Snap[]>();
  private readonly loaded = new Set<string>();

  isLoaded(region: RegionRef): boolean {
    return this.loaded.has(regionKey(region));
  }

  /** Marks a region as loaded, once its ways and stations are added. */
  markLoaded(region: RegionRef): void {
    this.loaded.add(regionKey(region));
  }

  hasStation(id: number): boolean {
    return this.stations.has(id);
  }

  /** Adds ways not added yet. To be called before snapping the stations near them. */
  addWays(ways: OsmRailWay[]): void {
    for (const way of ways) {
      if (this.ways.has(way.id)) {
        continue;
      }
      this.ways.add(way.id);
      way.nodes.forEach((id, i) => {
        if (!this.nodes.has(id)) {
          this.nodes.set(id, { point: way.coords[i], edges: [], stations: [] });
        }
      });
      for (let i = 1; i < way.nodes.length; i++) {
        const a = way.nodes[i - 1];
        const b = way.nodes[i];
        if (a === b) {
          continue;
        }
        const length = distance(this.point(a), this.point(b));
        this.node(a).edges.push({ to: b, length, stops: [] });
        this.node(b).edges.push({ to: a, length, stops: [] });
        this.index({ way: way.id, a, b });
      }
    }
  }

  /**
   * Snaps a station to the nearest track within `SNAP_MAX_M`, and to the
   * other tracks almost as near (one point per way). A station already
   * added is left as is.
   */
  addStation(station: GraphStation): void {
    if (this.stations.has(station.id)) {
      return;
    }
    const origin: Point = [station.lon, station.lat];
    const nearestByWay = new Map<
      number,
      { d: number; segment: Segment; t: number }
    >();
    for (const segment of this.segmentsAround(origin, SNAP_MAX_M)) {
      const { d, t } = project(
        origin,
        this.point(segment.a),
        this.point(segment.b),
      );
      const best = nearestByWay.get(segment.way);
      if (d <= SNAP_MAX_M && (!best || d < best.d)) {
        nearestByWay.set(segment.way, { d, segment, t });
      }
    }
    const nearest = Math.min(...[...nearestByWay.values()].map(({ d }) => d));
    const snaps: Snap[] = [];
    for (const { d, segment, t } of nearestByWay.values()) {
      if (d > nearest + SNAP_TRACK_GAP_M) {
        continue;
      }
      const a = this.point(segment.a);
      const b = this.point(segment.b);
      const length = distance(a, b);
      if (t * length < SNAP_NODE_M) {
        snaps.push(this.stopAtNode(segment.a, station.id));
      } else if ((1 - t) * length < SNAP_NODE_M) {
        snaps.push(this.stopAtNode(segment.b, station.id));
      } else {
        const point: Point = [
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
        ];
        this.stopOnEdge(segment.a, segment.b, station.id, t, point);
        snaps.push({ a: segment.a, b: segment.b, t, point });
      }
    }
    this.stations.set(station.id, snaps);
  }

  /**
   * Walks the tracks from a station, shortest paths first, until each path
   * meets a station or goes beyond `maxM`. A path reaching a region not
   * loaded makes the result incomplete: the region is reported as missing
   * and no link is returned.
   */
  walk(from: number, maxM = WALK_MAX_M): WalkResult {
    const snaps = this.stations.get(from);
    if (!snaps) {
      throw new Error(`Station ${from} is not in the graph`);
    }
    const dist = new Map<number, number>();
    const predecessors = new Map<number, Predecessor>();
    const arrivals = new Map<number, Arrival>();
    const missing = new Map<string, RegionRef>();
    const heap = new MinHeap();

    const reach = (node: number, d: number, predecessor: Predecessor): void => {
      if (d < (dist.get(node) ?? Infinity)) {
        dist.set(node, d);
        predecessors.set(node, predecessor);
        heap.push(d, node);
      }
    };
    const arrive = (station: number, arrival: Arrival): void => {
      if (station === from) {
        return;
      }
      const known = arrivals.get(station);
      if (!known || arrival.lengthM < known.lengthM) {
        arrivals.set(station, arrival);
      }
    };

    for (const snap of snaps) {
      if ('node' in snap) {
        reach(snap.node, 0, { start: null });
        continue;
      }
      const edge = this.edge(snap.a, snap.b);
      const before = edge.stops
        .filter((stop) => stop.t < snap.t && stop.station !== from)
        .at(-1);
      const after = edge.stops.find(
        (stop) => stop.t > snap.t && stop.station !== from,
      );
      if (before) {
        arrive(before.station, {
          lengthM: (snap.t - before.t) * edge.length,
          end: null,
          start: snap.point,
          point: before.point,
        });
      } else {
        reach(snap.a, snap.t * edge.length, { start: snap.point });
      }
      if (after) {
        arrive(after.station, {
          lengthM: (after.t - snap.t) * edge.length,
          end: null,
          start: snap.point,
          point: after.point,
        });
      } else {
        reach(snap.b, (1 - snap.t) * edge.length, { start: snap.point });
      }
    }

    for (let next = heap.pop(); next; next = heap.pop()) {
      const [d, id] = next;
      if (d > (dist.get(id) ?? Infinity)) {
        continue;
      }
      if (d > maxM) {
        break;
      }
      const node = this.node(id);
      const region = regionOf(node.point[0], node.point[1]);
      if (!this.isLoaded(region)) {
        missing.set(regionKey(region), region);
        continue;
      }
      const others = node.stations.filter((station) => station !== from);
      for (const station of others) {
        arrive(station, { lengthM: d, end: id, start: null, point: null });
      }
      // The walk never passes a station, except one at its very start.
      if (others.length > 0 && d > 0) {
        continue;
      }
      for (const edge of node.edges) {
        const stop = edge.stops[0];
        if (!stop) {
          reach(edge.to, d + edge.length, { prev: id });
        } else if (stop.station !== from) {
          // The walk never passes a station: it is a neighbor.
          arrive(stop.station, {
            lengthM: d + stop.t * edge.length,
            end: id,
            start: null,
            point: stop.point,
          });
        }
      }
    }

    if (missing.size > 0) {
      return { links: [], missing: [...missing.values()] };
    }
    const links = [...arrivals]
      .map(([to, arrival]) => ({
        from,
        to,
        lengthM: arrival.lengthM,
        coords: this.pathOf(arrival, predecessors),
      }))
      // Two stations at the same point, such as a station mapped twice, are not a link.
      .filter((link) => link.coords.length >= 2);
    return { links, missing: [] };
  }

  private pathOf(
    arrival: Arrival,
    predecessors: Map<number, Predecessor>,
  ): Point[] {
    const coords: Point[] = [];
    if (arrival.end === null) {
      coords.push(arrival.start!);
    } else {
      const chain: Point[] = [];
      let node: number | null = arrival.end;
      while (node !== null) {
        chain.push(this.point(node));
        const predecessor: Predecessor = predecessors.get(node)!;
        if ('prev' in predecessor) {
          node = predecessor.prev;
        } else {
          if (predecessor.start) {
            chain.push(predecessor.start);
          }
          node = null;
        }
      }
      coords.push(...chain.reverse());
    }
    if (arrival.point) {
      coords.push(arrival.point);
    }
    return coords.filter(
      (point, i) =>
        i === 0 ||
        point[0] !== coords[i - 1][0] ||
        point[1] !== coords[i - 1][1],
    );
  }

  private stopAtNode(node: number, station: number): Snap {
    this.node(node).stations.push(station);
    return { node };
  }

  /** Adds the stop on both directions of every edge between `a` and `b`. */
  private stopOnEdge(
    a: number,
    b: number,
    station: number,
    t: number,
    point: Point,
  ): void {
    const add = (from: number, to: number, share: number): void => {
      for (const edge of this.node(from).edges) {
        if (edge.to === to) {
          edge.stops.push({ station, t: share, point });
          edge.stops.sort((p, q) => p.t - q.t);
        }
      }
    };
    add(a, b, t);
    add(b, a, 1 - t);
  }

  private edge(a: number, b: number): Edge {
    const edge = this.node(a).edges.find((candidate) => candidate.to === b);
    if (!edge) {
      throw new Error(`No edge between ${a} and ${b}`);
    }
    return edge;
  }

  private node(id: number): GraphNode {
    const node = this.nodes.get(id);
    if (!node) {
      throw new Error(`Node ${id} is not in the graph`);
    }
    return node;
  }

  private point(id: number): Point {
    return this.node(id).point;
  }

  private index(segment: Segment): void {
    const a = this.point(segment.a);
    const b = this.point(segment.b);
    const [x0, x1] = [cell(Math.min(a[0], b[0])), cell(Math.max(a[0], b[0]))];
    const [y0, y1] = [cell(Math.min(a[1], b[1])), cell(Math.max(a[1], b[1]))];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const key = `${x}/${y}`;
        const segments = this.cells.get(key);
        if (segments) {
          segments.push(segment);
        } else {
          this.cells.set(key, [segment]);
        }
      }
    }
  }

  /** Segments of the cells within `radiusM` of a point, each once. */
  private segmentsAround([lon, lat]: Point, radiusM: number): Set<Segment> {
    const dLat = radiusM / METERS_PER_DEGREE;
    const dLon =
      radiusM / (METERS_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
    const found = new Set<Segment>();
    for (let x = cell(lon - dLon); x <= cell(lon + dLon); x++) {
      for (let y = cell(lat - dLat); y <= cell(lat + dLat); y++) {
        for (const segment of this.cells.get(`${x}/${y}`) ?? []) {
          found.add(segment);
        }
      }
    }
    return found;
  }
}

function cell(degrees: number): number {
  return Math.floor(degrees / GRID_DEG);
}

function distance(a: Point, b: Point): number {
  return metersBetween([a[1], a[0]], [b[1], b[0]]);
}

/** Distance from `p` to the segment `a → b`, and share of the segment of the nearest point. */
function project(p: Point, a: Point, b: Point): { d: number; t: number } {
  // Local plane around `p`, in meters: exact enough within a few hundred meters.
  const kx = METERS_PER_DEGREE * Math.cos((p[1] * Math.PI) / 180);
  const ky = METERS_PER_DEGREE;
  const ax = (a[0] - p[0]) * kx;
  const ay = (a[1] - p[1]) * ky;
  const bx = (b[0] - p[0]) * kx;
  const by = (b[1] - p[1]) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return { d: Math.hypot(ax + dx * t, ay + dy * t), t };
}

/** Binary heap of `[priority, value]`, the lowest priority first. */
class MinHeap {
  private readonly items: [number, number][] = [];

  push(priority: number, value: number): void {
    const items = this.items;
    items.push([priority, value]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): [number, number] | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && items[left][0] < items[smallest][0])
          smallest = left;
        if (right < items.length && items[right][0] < items[smallest][0])
          smallest = right;
        if (smallest === i) break;
        [items[smallest], items[i]] = [items[i], items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

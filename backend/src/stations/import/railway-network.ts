import {
  type NodeStore,
  type Point,
  project,
  type RailwayData,
} from './railway-data';

/** A station farther than this from any passenger track is linked to none. */
export const SNAP_MAX_M = 400;
/**
 * Besides the nearest track, a station stands on the other tracks at most
 * this much farther: the parallel tracks of its line.
 */
const SNAP_TRACK_GAP_M = 60;
/**
 * Any other track this close to a station passes by it: a walk along it
 * stops there without linking it, such as a bypass along a station.
 */
export const BARRIER_RADIUS_M = 150;
/** A stop this close to the end of a chain stands on its vertex. */
const VERTEX_STOP_M = 1;
/** Beyond this distance along the tracks, a walk gives up without a link. */
export const WALK_MAX_M = 300_000;
/**
 * A link longer than this many times the straight distance between its
 * stations, plus `DETOUR_SLACK_M`, is a detour no train takes: rejected.
 */
export const DETOUR_RATIO = 1.5;
export const DETOUR_SLACK_M = 5_000;
/**
 * A link is redundant when two other links through a third station are at
 * most this many times longer: the stations near the end of a line without
 * stops, such as a high-speed line, would otherwise all be linked along it.
 */
export const REDUNDANT_RATIO = 1.1;

const METERS_PER_DEGREE = 111_320;
/** Cells of the index of the stations, in degrees. */
const CELL_DEG = 0.01;

/** A link found between two stations, by their index in `RailwayData.stations`. */
export interface NetworkLink {
  a: number;
  b: number;
  lengthM: number;
  /** `[lon, lat]` from `a` to `b` along the tracks. */
  coords: Point[];
}

export interface NetworkResult {
  links: NetworkLink[];
  /** Links found but longer than a train would go: kept for the report. */
  detours: { a: number; b: number; lengthM: number; straightM: number }[];
  /** Kept stations without any passenger track within `SNAP_MAX_M`. */
  isolated: number[];
  /** Links dropped as redundant, for the report. */
  redundant: { a: number; b: number; lengthM: number; via: number }[];
}

/** A station on a chain, `offset` meters from its first vertex. */
interface ChainStop {
  station: number;
  offset: number;
  /** False for a station merely beside the track: it stops the walks without being linked. */
  link: boolean;
}

interface VertexStop {
  station: number;
  link: boolean;
}

/** Where a station stands on the network. */
type Snap = { vertex: number } | { chain: number; offset: number };

/** How a walk reached a vertex: by a chain from another vertex, or from the start. */
interface Arrival {
  lengthM: number;
  /** Vertex the path reaches before the station; -1 when the station is on a start chain. */
  vertex: number;
  /** Chain from `vertex` to the station, and the station's offset on it; -1 when at the vertex. */
  chain: number;
  offset: number;
  /** For a station on a start chain: the start snap. */
  start: { chain: number; offset: number } | null;
}

function metersBetween([lon1, lat1]: Point, [lon2, lat2]: Point): number {
  const x = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(x, lat2 - lat1) * METERS_PER_DEGREE;
}

function cellKey(cx: number, cy: number): number {
  return (cx + 20_000) * 40_000 + (cy + 10_000);
}

/**
 * Network of the passenger tracks: the nodes shared by several tracks, or
 * ending one, are its vertices, joined by chains of nodes. The stations
 * stand on the chains or the vertices. A walk from a station follows the
 * chains, shortest paths first, and stops at every station it meets: those
 * linked are its neighbors.
 */
export class RailwayNetwork {
  private readonly nodes: NodeStore;
  private readonly stationPoints: Point[];
  /** Positions in `trackNodes` of the first and last node of each chain, its vertices, its length. */
  private chainStart!: Int32Array;
  private chainEnd!: Int32Array;
  private chainFrom!: Int32Array;
  private chainTo!: Int32Array;
  private chainLength!: Float64Array;
  private chainCount = 0;
  private trackNodes: Int32Array;
  /** Chains at each vertex: `adjacency[adjacencyStart[v] .. adjacencyStart[v + 1]]`. */
  private adjacencyStart!: Int32Array;
  private adjacency!: Int32Array;
  private vertexCount = 0;
  private vertexNode!: Int32Array;
  private readonly chainStops = new Map<number, ChainStop[]>();
  private readonly vertexStops = new Map<number, VertexStop[]>();
  private readonly snaps = new Map<number, Snap[]>();
  private readonly isolated: number[] = [];

  constructor(data: RailwayData) {
    this.nodes = data.nodes;
    this.trackNodes = data.tracks.nodes;
    const kept = data.stations.flatMap((station, index) =>
      station.exclusion === null ? [index] : [],
    );
    this.stationPoints = data.stations.map((station) => station.point);
    const trackSnaps = this.snapStations(data, kept);
    this.buildChains(data, trackSnaps);
  }

  /** Finds the links of every kept station. */
  linkAll(maxM = WALK_MAX_M): NetworkResult {
    const best = new Map<string, NetworkLink>();
    const detours = new Map<string, NetworkResult['detours'][number]>();
    const dist = new Float64Array(this.vertexCount).fill(Infinity);
    const predecessor = new Int32Array(this.vertexCount);
    for (const station of this.snaps.keys()) {
      for (const link of this.walk(station, maxM, dist, predecessor)) {
        const [a, b] = link.a < link.b ? [link.a, link.b] : [link.b, link.a];
        const key = `${a}/${b}`;
        const straightM = metersBetween(
          this.stationPoints[a],
          this.stationPoints[b],
        );
        if (link.lengthM > straightM * DETOUR_RATIO + DETOUR_SLACK_M) {
          detours.set(key, { a, b, lengthM: link.lengthM, straightM });
          continue;
        }
        const known = best.get(key);
        if (!known || link.lengthM < known.lengthM) {
          best.set(key, {
            a,
            b,
            lengthM: link.lengthM,
            coords: link.a === a ? link.coords : [...link.coords].reverse(),
          });
        }
      }
    }
    const { links, redundant } = withoutRedundant([...best.values()]);
    return {
      links,
      detours: [...detours.values()],
      isolated: this.isolated,
      redundant,
    };
  }

  /** Links found from one station, toward the first stations met along each path. */
  walk(
    from: number,
    maxM = WALK_MAX_M,
    dist = new Float64Array(this.vertexCount).fill(Infinity),
    predecessor = new Int32Array(this.vertexCount),
  ): NetworkLink[] {
    const snaps = this.snaps.get(from) ?? [];
    const touched: number[] = [];
    const heap = new MinHeap();
    const arrivals = new Map<number, Arrival>();
    // Predecessor chain of each vertex, or -1 - (index of the start snap).
    const reach = (vertex: number, d: number, chain: number): void => {
      if (d < dist[vertex]) {
        if (dist[vertex] === Infinity) touched.push(vertex);
        dist[vertex] = d;
        predecessor[vertex] = chain;
        heap.push(d, vertex);
      }
    };
    const arrive = (station: number, arrival: Arrival): void => {
      const known = arrivals.get(station);
      if (station !== from && (!known || arrival.lengthM < known.lengthM))
        arrivals.set(station, arrival);
    };

    snaps.forEach((snap, index) => {
      if ('vertex' in snap) {
        reach(snap.vertex, 0, -1 - index);
        return;
      }
      const { chain, offset } = snap;
      const stops = (this.chainStops.get(chain) ?? []).filter(
        (stop) => stop.station !== from,
      );
      const before = stops.filter((stop) => stop.offset < offset).at(-1);
      const after = stops.find((stop) => stop.offset > offset);
      if (before) {
        if (before.link) {
          arrive(before.station, {
            lengthM: offset - before.offset,
            vertex: -1,
            chain,
            offset: before.offset,
            start: snap,
          });
        }
      } else {
        reach(this.chainFrom[chain], offset, -1 - index);
      }
      if (after) {
        if (after.link) {
          arrive(after.station, {
            lengthM: after.offset - offset,
            vertex: -1,
            chain,
            offset: after.offset,
            start: snap,
          });
        }
      } else {
        reach(
          this.chainTo[chain],
          this.chainLength[chain] - offset,
          -1 - index,
        );
      }
    });

    for (let next = heap.pop(); next; next = heap.pop()) {
      const [d, vertex] = next;
      if (d > dist[vertex]) continue;
      if (d > maxM) break;
      const stops = this.vertexStops.get(vertex);
      if (stops) {
        let blocked = false;
        for (const stop of stops) {
          // The station never stops its own walk, even beside its tracks.
          if (stop.station === from) continue;
          if (stop.link)
            arrive(stop.station, {
              lengthM: d,
              vertex,
              chain: -1,
              offset: 0,
              start: null,
            });
          blocked ||= d > 0;
        }
        // The walk never passes a station, except one at its very start.
        if (blocked) continue;
      }
      for (
        let i = this.adjacencyStart[vertex];
        i < this.adjacencyStart[vertex + 1];
        i++
      ) {
        const chain = this.adjacency[i];
        const forward = this.chainFrom[chain] === vertex;
        const ends =
          this.chainFrom[chain] === this.chainTo[chain]
            ? [true, false]
            : [forward];
        for (const ascending of ends) {
          const length = this.chainLength[chain];
          const stop = this.firstStop(chain, ascending, from);
          if (!stop) {
            reach(
              ascending ? this.chainTo[chain] : this.chainFrom[chain],
              d + length,
              chain,
            );
          } else if (stop.link) {
            const along = ascending ? stop.offset : length - stop.offset;
            arrive(stop.station, {
              lengthM: d + along,
              vertex,
              chain,
              offset: stop.offset,
              start: null,
            });
          }
        }
      }
    }

    const links = [...arrivals].flatMap(([to, arrival]) => {
      const coords = this.pathOf(arrival, predecessor, snaps);
      return coords.length >= 2 && arrival.lengthM > 0
        ? [{ a: from, b: to, lengthM: arrival.lengthM, coords }]
        : [];
    });
    for (const vertex of touched) dist[vertex] = Infinity;
    return links;
  }

  /** The first stop met along a chain in a direction, but those of `from`. */
  private firstStop(
    chain: number,
    ascending: boolean,
    from: number,
  ): ChainStop | undefined {
    const stops = this.chainStops.get(chain);
    if (!stops) return undefined;
    for (let i = 0; i < stops.length; i++) {
      const stop = stops[ascending ? i : stops.length - 1 - i];
      if (stop.station !== from) return stop;
    }
    return undefined;
  }

  /** The path to a station, from the start snap. */
  private pathOf(
    arrival: Arrival,
    predecessor: Int32Array,
    snaps: Snap[],
  ): Point[] {
    let coords: Point[];
    if (arrival.vertex === -1) {
      coords = this.chainPart(
        arrival.start!.chain,
        arrival.start!.offset,
        arrival.offset,
      );
    } else {
      coords = this.pathToVertex(arrival.vertex, predecessor, snaps);
      if (arrival.chain !== -1) {
        const chain = arrival.chain;
        const fromOffset =
          this.chainFrom[chain] === arrival.vertex
            ? 0
            : this.chainLength[chain];
        coords.push(
          ...this.chainPart(chain, fromOffset, arrival.offset).slice(1),
        );
      }
    }
    return coords.filter(
      (point, i) =>
        i === 0 ||
        point[0] !== coords[i - 1][0] ||
        point[1] !== coords[i - 1][1],
    );
  }

  private pathToVertex(
    vertex: number,
    predecessor: Int32Array,
    snaps: Snap[],
  ): Point[] {
    const parts: Point[][] = [];
    let current = vertex;
    // Bounded by the number of vertices: each step goes to a vertex reached earlier.
    for (let steps = 0; steps <= this.vertexCount; steps++) {
      const chain = predecessor[current];
      if (chain < 0) {
        const snap = snaps[-1 - chain];
        if ('chain' in snap) {
          const end =
            this.chainFrom[snap.chain] === current
              ? 0
              : this.chainLength[snap.chain];
          parts.push(this.chainPart(snap.chain, snap.offset, end));
        } else {
          parts.push([this.nodes.point(this.vertexNode[current])]);
        }
        break;
      }
      const forward = this.chainTo[chain] === current;
      const previous = forward ? this.chainFrom[chain] : this.chainTo[chain];
      parts.push(
        forward
          ? this.chainPart(chain, 0, this.chainLength[chain])
          : this.chainPart(chain, this.chainLength[chain], 0),
      );
      current = previous;
    }
    return parts
      .reverse()
      .flatMap((part, i) => (i === 0 ? part : part.slice(1)));
  }

  /** Points of a chain between two offsets, in that direction, the ends interpolated. */
  private chainPart(
    chain: number,
    fromOffset: number,
    toOffset: number,
  ): Point[] {
    const low = Math.min(fromOffset, toOffset);
    const high = Math.max(fromOffset, toOffset);
    const points: Point[] = [];
    let travelled = 0;
    for (
      let position = this.chainStart[chain];
      position < this.chainEnd[chain];
      position++
    ) {
      const a = this.nodes.point(this.trackNodes[position]);
      const b = this.nodes.point(this.trackNodes[position + 1]);
      const length = metersBetween(a, b);
      const next = travelled + length;
      if (next >= low && travelled <= high) {
        const at = (offset: number): Point => {
          const t =
            length === 0
              ? 0
              : Math.min(1, Math.max(0, (offset - travelled) / length));
          return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        };
        if (points.length === 0) points.push(at(low));
        points.push(next <= high ? b : at(high));
      }
      travelled = next;
      if (travelled > high) break;
    }
    return fromOffset <= toOffset ? points : points.reverse();
  }

  /**
   * Snaps each kept station to the nearest passenger track within
   * `SNAP_MAX_M` and to the other tracks almost as near, where it can be
   * linked; the other tracks within `BARRIER_RADIUS_M` only pass by it.
   * Returns the snaps by track.
   */
  private snapStations(
    data: RailwayData,
    kept: number[],
  ): Map<
    number,
    { station: number; segment: number; t: number; link: boolean }[]
  > {
    const cells = new Map<number, number[]>();
    for (const station of kept) {
      const [lon, lat] = this.stationPoints[station];
      const key = cellKey(
        Math.floor(lon / CELL_DEG),
        Math.floor(lat / CELL_DEG),
      );
      const cell = cells.get(key);
      if (cell) cell.push(station);
      else cells.set(key, [station]);
    }
    // The nearest point of each track to each station within reach.
    const nearest = new Map<
      number,
      Map<number, { d: number; segment: number; t: number }>
    >();
    const { tracks } = data;
    for (let track = 0; track < tracks.count; track++) {
      if (!tracks.passenger[track]) continue;
      for (
        let position = tracks.starts[track];
        position < tracks.starts[track + 1] - 1;
        position++
      ) {
        const a = this.nodes.point(tracks.nodes[position]);
        const b = this.nodes.point(tracks.nodes[position + 1]);
        const lat = (a[1] + b[1]) / 2;
        const dLat = SNAP_MAX_M / METERS_PER_DEGREE;
        const dLon =
          SNAP_MAX_M /
          (METERS_PER_DEGREE * Math.max(0.05, Math.cos((lat * Math.PI) / 180)));
        const x0 = Math.floor((Math.min(a[0], b[0]) - dLon) / CELL_DEG);
        const x1 = Math.floor((Math.max(a[0], b[0]) + dLon) / CELL_DEG);
        const y0 = Math.floor((Math.min(a[1], b[1]) - dLat) / CELL_DEG);
        const y1 = Math.floor((Math.max(a[1], b[1]) + dLat) / CELL_DEG);
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            for (const station of cells.get(cellKey(x, y)) ?? []) {
              const { d, t } = project(this.stationPoints[station], a, b);
              if (d > SNAP_MAX_M) continue;
              let byTrack = nearest.get(station);
              if (!byTrack) {
                byTrack = new Map<
                  number,
                  { d: number; segment: number; t: number }
                >();
                nearest.set(station, byTrack);
              }
              const best = byTrack.get(track);
              if (!best || d < best.d)
                byTrack.set(track, {
                  d,
                  segment: position - tracks.starts[track],
                  t,
                });
            }
          }
        }
      }
    }
    const byTrack = new Map<
      number,
      { station: number; segment: number; t: number; link: boolean }[]
    >();
    for (const station of kept) {
      const candidates = nearest.get(station);
      if (!candidates || candidates.size === 0) {
        this.isolated.push(station);
        continue;
      }
      const min = Math.min(...[...candidates.values()].map(({ d }) => d));
      for (const [track, { d, segment, t }] of candidates) {
        const link = d <= min + SNAP_TRACK_GAP_M;
        if (!link && d > BARRIER_RADIUS_M) continue;
        const list = byTrack.get(track);
        const snap = { station, segment, t, link };
        if (list) list.push(snap);
        else byTrack.set(track, [snap]);
      }
    }
    return byTrack;
  }

  /** Splits the passenger tracks into chains between vertices, placing the stations on them. */
  private buildChains(
    data: RailwayData,
    trackSnaps: Map<
      number,
      { station: number; segment: number; t: number; link: boolean }[]
    >,
  ): void {
    const { tracks } = data;
    // Number of passenger tracks through each node, ends counted twice.
    const uses = new Uint8Array(this.nodes.size);
    for (let track = 0; track < tracks.count; track++) {
      if (!tracks.passenger[track]) continue;
      const first = tracks.starts[track];
      const last = tracks.starts[track + 1] - 1;
      for (let position = first; position <= last; position++) {
        const node = tracks.nodes[position];
        const add = position === first || position === last ? 2 : 1;
        uses[node] = Math.min(255, uses[node] + add);
      }
    }
    const vertexOf = new Int32Array(this.nodes.size).fill(-1);
    const vertexNodes: number[] = [];
    for (let node = 0; node < uses.length; node++) {
      if (uses[node] >= 2) {
        vertexOf[node] = vertexNodes.length;
        vertexNodes.push(node);
      }
    }
    this.vertexCount = vertexNodes.length;
    this.vertexNode = Int32Array.from(vertexNodes);

    const starts: number[] = [];
    const ends: number[] = [];
    const froms: number[] = [];
    const tos: number[] = [];
    const lengths: number[] = [];
    const addSnap = (station: number, snap: Snap, link: boolean): void => {
      if ('vertex' in snap) {
        const stops = this.vertexStops.get(snap.vertex);
        if (stops) stops.push({ station, link });
        else this.vertexStops.set(snap.vertex, [{ station, link }]);
      } else {
        const stops = this.chainStops.get(snap.chain);
        if (stops) stops.push({ station, offset: snap.offset, link });
        else
          this.chainStops.set(snap.chain, [
            { station, offset: snap.offset, link },
          ]);
      }
      if (link) {
        const own = this.snaps.get(station);
        if (own) own.push(snap);
        else this.snaps.set(station, [snap]);
      }
    };

    for (let track = 0; track < tracks.count; track++) {
      if (!tracks.passenger[track]) continue;
      const first = tracks.starts[track];
      const last = tracks.starts[track + 1] - 1;
      const snaps = (trackSnaps.get(track) ?? []).sort(
        (p, q) => p.segment - q.segment || p.t - q.t,
      );
      let snapIndex = 0;
      let chainFirst = first;
      let length = 0;
      const pending: { station: number; offset: number; link: boolean }[] = [];
      for (let position = first; position < last; position++) {
        const a = this.nodes.point(tracks.nodes[position]);
        const b = this.nodes.point(tracks.nodes[position + 1]);
        const segmentLength = metersBetween(a, b);
        const segment = position - first;
        while (
          snapIndex < snaps.length &&
          snaps[snapIndex].segment === segment
        ) {
          const snap = snaps[snapIndex++];
          pending.push({
            station: snap.station,
            offset: length + snap.t * segmentLength,
            link: snap.link,
          });
        }
        length += segmentLength;
        if (vertexOf[tracks.nodes[position + 1]] !== -1) {
          const chain = starts.length;
          starts.push(chainFirst);
          ends.push(position + 1);
          froms.push(vertexOf[tracks.nodes[chainFirst]]);
          tos.push(vertexOf[tracks.nodes[position + 1]]);
          lengths.push(length);
          for (const stop of pending) {
            const snap: Snap =
              stop.offset < VERTEX_STOP_M
                ? { vertex: froms[chain] }
                : stop.offset > length - VERTEX_STOP_M
                  ? { vertex: tos[chain] }
                  : { chain, offset: stop.offset };
            addSnap(stop.station, snap, stop.link);
          }
          pending.length = 0;
          chainFirst = position + 1;
          length = 0;
        }
      }
    }
    for (const stops of this.chainStops.values())
      stops.sort((p, q) => p.offset - q.offset);

    this.chainCount = starts.length;
    this.chainStart = Int32Array.from(starts);
    this.chainEnd = Int32Array.from(ends);
    this.chainFrom = Int32Array.from(froms);
    this.chainTo = Int32Array.from(tos);
    this.chainLength = Float64Array.from(lengths);
    const degree = new Int32Array(this.vertexCount + 1);
    for (let chain = 0; chain < this.chainCount; chain++) {
      degree[this.chainFrom[chain] + 1]++;
      if (this.chainTo[chain] !== this.chainFrom[chain])
        degree[this.chainTo[chain] + 1]++;
    }
    for (let v = 0; v < this.vertexCount; v++) degree[v + 1] += degree[v];
    this.adjacencyStart = degree;
    this.adjacency = new Int32Array(degree[this.vertexCount]);
    const fill = degree.slice(0, this.vertexCount);
    for (let chain = 0; chain < this.chainCount; chain++) {
      this.adjacency[fill[this.chainFrom[chain]]++] = chain;
      if (this.chainTo[chain] !== this.chainFrom[chain])
        this.adjacency[fill[this.chainTo[chain]]++] = chain;
    }
  }
}

/**
 * Drops the links for which two shorter kept links through a third station
 * are at most `REDUNDANT_RATIO` times longer, the longest first: the
 * stations stay connected by the links kept.
 */
export function withoutRedundant(links: NetworkLink[]): {
  links: NetworkLink[];
  redundant: NetworkResult['redundant'];
} {
  const neighbors = new Map<number, Map<number, number>>();
  const lengthOf = (a: number, b: number): number | undefined =>
    neighbors.get(a)?.get(b);
  for (const link of links) {
    for (const [from, to] of [
      [link.a, link.b],
      [link.b, link.a],
    ]) {
      const own = neighbors.get(from);
      if (own) own.set(to, link.lengthM);
      else neighbors.set(from, new Map([[to, link.lengthM]]));
    }
  }
  const kept: NetworkLink[] = [];
  const redundant: NetworkResult['redundant'] = [];
  for (const link of [...links].sort((p, q) => q.lengthM - p.lengthM)) {
    let via = -1;
    for (const [station, toA] of neighbors.get(link.a)!) {
      if (station === link.b) continue;
      const toB = lengthOf(station, link.b);
      if (toB !== undefined && toA + toB <= link.lengthM * REDUNDANT_RATIO) {
        via = station;
        break;
      }
    }
    if (via === -1) {
      kept.push(link);
      continue;
    }
    neighbors.get(link.a)!.delete(link.b);
    neighbors.get(link.b)!.delete(link.a);
    redundant.push({ a: link.a, b: link.b, lengthM: link.lengthM, via });
  }
  return { links: kept, redundant };
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

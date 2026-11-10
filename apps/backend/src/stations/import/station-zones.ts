import type { OplMember, Tags } from './osm-opl';
import {
  isPlatformRoof,
  isStationBuilding,
  isTrainPlatform,
  isUnderground,
} from './railway-rules';
import type { NodeStore, RailwayData } from './railway-data';
import { metersBetween, type Point, PointIndex, project } from './railway-geo';

/**
 * The zone of a station: a station is visited once any small tile (z17)
 * touching it is. Exactly one source per station, never a union:
 * - `osm`: its footprint, from the platforms and buildings mapped for it;
 * - `rails`: else the passenger tracks walked `RAIL_REACH_M` on each side of its point;
 * - `point`: else the small tile of its point.
 */
export type ZoneSource = 'osm' | 'rails' | 'point';

/** Metres of track walked on each side of the station point. */
export const RAIL_REACH_M = 100;
/** Platforms this close to a station belong to it (to the nearest one). */
export const PLATFORM_RADIUS_M = 150;
/** Platforms of its stop area this close to a station belong to it. */
export const STOP_AREA_RADIUS_M = 2 * PLATFORM_RADIUS_M;
/** Station buildings this close to the station point belong to it. */
export const BUILDING_RADIUS_M = 150;
/** Roofs and transport buildings this close to a platform of the station are part of it. */
export const ROOF_RADIUS_M = 8;
/** Platforms of a level this close to each other form one block. */
export const CLUSTER_GAP_M = 50;
/** Tracks this much farther than the nearest one still start a walk. */
export const TRACK_SLACK_M = 40;
/** Tracks farther than this from the point start no walk. */
export const TRACK_MAX_M = 150;
/** Platforms and buildings farther than this from every candidate station are not kept. */
const KEEP_RADIUS_M = 400;

/** A platform or a building mapped near a station. */
export interface ZoneFeature {
  /** `n123`, `w456` or `r789`. */
  key: string;
  platform: boolean;
  stationBuilding: boolean;
  roof: boolean;
  underground: boolean;
  /** Its lines or rings, `[lon, lat]`; a node is a single point. */
  parts: Point[][];
}

export interface ZoneFeatures {
  features: ZoneFeature[];
  /** Members of each stop area, as `n123`, `w456`. */
  stopAreas: string[][];
}

/** What PostGIS needs to draw the zone of a station. */
export interface ZoneInput {
  /** Index of the station in `RailwayData.stations`. */
  station: number;
  source: ZoneSource;
  /** Per group of platforms, the lines of its platforms. */
  clusters: Point[][][];
  /** Rings of the station buildings and of the roofs over its platforms. */
  buildings: Point[][];
  /** The tracks walked from the point. */
  rails: Point[][];
}

const isClosed = (part: Point[]): boolean =>
  part.length >= 4 &&
  part[0][0] === part[part.length - 1][0] &&
  part[0][1] === part[part.length - 1][1];

/**
 * Collects, while an extract is read, the platforms and buildings near
 * the candidate stations, and the stop areas.
 */
export class ZoneFeatureCollector {
  private readonly features: ZoneFeature[] = [];
  /** Lines of the ways kept, for the platforms mapped as relations. */
  private readonly ways = new Map<number, Point[]>();
  private readonly stopAreas: string[][] = [];
  private candidates: PointIndex | null = null;

  constructor(
    private readonly nodes: NodeStore,
    private readonly candidatePoints: () => Point[],
  ) {}

  addNode(id: number, tags: Tags | null, point: Point): void {
    if (!isTrainPlatform(tags)) return;
    this.features.push(feature(`n${id}`, tags, [[point]]));
  }

  addWay(id: number, tags: Tags | null, refs: number[]): void {
    const line: Point[] = [];
    for (const ref of refs) {
      const index = this.nodes.indexOf(ref);
      if (index !== -1) line.push(this.nodes.point(index));
    }
    if (line.length < 2 || !this.nearCandidate(line)) return;
    this.ways.set(id, line);
    if (
      isTrainPlatform(tags) ||
      isStationBuilding(tags) ||
      isPlatformRoof(tags)
    ) {
      this.features.push(feature(`w${id}`, tags, [line]));
    }
  }

  addRelation(id: number, tags: Tags | null, members: OplMember[]): void {
    if (!isTrainPlatform(tags)) return;
    const parts = members.flatMap((member) => {
      const line = member.type === 'w' ? this.ways.get(member.id) : undefined;
      return line ? [line] : [];
    });
    if (parts.length > 0) this.features.push(feature(`r${id}`, tags, parts));
  }

  addStopArea(members: OplMember[]): void {
    this.stopAreas.push(
      members
        .filter((member) => member.type !== 'r')
        .map((member) => `${member.type}${member.id}`),
    );
  }

  finish(): ZoneFeatures {
    this.ways.clear();
    return { features: this.features, stopAreas: this.stopAreas };
  }

  private nearCandidate(line: Point[]): boolean {
    if (!this.candidates) {
      this.candidates = new PointIndex();
      for (const point of this.candidatePoints()) this.candidates.add(point);
    }
    return line.some((point) =>
      this.candidates!.hasPointNear(point, KEEP_RADIUS_M),
    );
  }
}

function feature(
  key: string,
  tags: Tags | null,
  parts: Point[][],
): ZoneFeature {
  const way = key[0] === 'w';
  const building = way && isClosed(parts[0]);
  return {
    key,
    platform: isTrainPlatform(tags),
    stationBuilding: building && isStationBuilding(tags),
    roof: building && isPlatformRoof(tags),
    underground: isUnderground(tags),
    parts,
  };
}

const vertices = (f: ZoneFeature): Point[] => f.parts.flat();

/** Whether a point lies inside a ring, by ray casting on the degrees. */
function inside([x, y]: Point, ring: Point[]): boolean {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = [ring[i], ring[j]];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    ) {
      within = !within;
    }
  }
  return within;
}

/** Distance in metres from a point to a feature, 0 inside one of its rings. */
export function distanceTo(f: ZoneFeature, point: Point): number {
  let best = Infinity;
  for (const part of f.parts) {
    if (part.length === 1) {
      best = Math.min(best, metersBetween(point, part[0]));
      continue;
    }
    if (isClosed(part) && inside(point, part)) return 0;
    for (let i = 0; i + 1 < part.length; i++) {
      best = Math.min(best, project(point, part[i], part[i + 1]).d);
    }
  }
  return best;
}

/** Whether a vertex of `f` lies within `radius` of one of `others`. */
function near(f: ZoneFeature, others: ZoneFeature[], radius: number): boolean {
  return vertices(f).some((v) =>
    others.some((other) => distanceTo(other, v) <= radius),
  );
}

/**
 * Groups of platforms: same level (surface or underground), chained when
 * `CLUSTER_GAP_M` apart at most.
 */
export function platformGroups(platforms: ZoneFeature[]): ZoneFeature[][] {
  let groups: { underground: boolean; platforms: ZoneFeature[] }[] = [];
  for (const p of platforms) {
    const joined = groups.filter(
      (g) =>
        g.underground === p.underground && near(p, g.platforms, CLUSTER_GAP_M),
    );
    groups = groups.filter((g) => !joined.includes(g));
    groups.push({
      underground: p.underground,
      platforms: [p, ...joined.flatMap((g) => g.platforms)],
    });
  }
  return groups.map((g) => g.platforms);
}

/** The cascade: the footprint when mapped, else the tracks, else the point. */
export function zoneSource(
  zone: Pick<ZoneInput, 'clusters' | 'buildings' | 'rails'>,
): ZoneSource {
  if (zone.clusters.length > 0 || zone.buildings.length > 0) return 'osm';
  return zone.rails.length > 0 ? 'rails' : 'point';
}

/** Items in cells of about 1 km, found from the 9 cells around a point. */
class CellIndex<T> {
  private readonly cells = new Map<string, T[]>();

  add(point: Point, item: T): void {
    const key = PointIndex.key(point[0], point[1]);
    const cell = this.cells.get(key);
    if (cell) {
      if (cell[cell.length - 1] !== item) cell.push(item);
    } else this.cells.set(key, [item]);
  }

  around([lon, lat]: Point): Set<T> {
    const found = new Set<T>();
    const cx = PointIndex.cell(lon);
    const cy = PointIndex.cell(lat);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const item of this.cells.get(`${x}/${y}`) ?? []) found.add(item);
      }
    }
    return found;
  }
}

const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Walks the zone tracks around the stations, `RAIL_REACH_M` on each side. */
export class TrackWalker {
  /** Segments `[track, position]` of the zone tracks near a station. */
  private readonly segments = new CellIndex<number>();
  /** Node index → positions of the zone tracks through it. */
  private readonly nodeTracks = new Map<number, number[]>();
  /** Track of each position. */
  private readonly trackOf: Int32Array;

  constructor(
    private readonly data: Pick<RailwayData, 'nodes' | 'tracks'>,
    stations: Point[],
  ) {
    const { tracks, nodes } = data;
    const cells = new Set<string>();
    for (const [lon, lat] of stations) {
      const cx = PointIndex.cell(lon);
      const cy = PointIndex.cell(lat);
      for (let x = cx - 1; x <= cx + 1; x++) {
        for (let y = cy - 1; y <= cy + 1; y++) cells.add(`${x}/${y}`);
      }
    }
    this.trackOf = new Int32Array(tracks.nodes.length);
    for (let track = 0; track < tracks.count; track++) {
      const [start, end] = [tracks.starts[track], tracks.starts[track + 1]];
      this.trackOf.fill(track, start, end);
      if (!tracks.zone[track]) continue;
      for (let position = start; position < end; position++) {
        const point = nodes.point(tracks.nodes[position]);
        if (!cells.has(PointIndex.key(point[0], point[1]))) continue;
        const node = tracks.nodes[position];
        const through = this.nodeTracks.get(node);
        if (through) through.push(position);
        else this.nodeTracks.set(node, [position]);
        // A segment is found from the cells of both its ends.
        if (position + 1 < end) this.segments.add(point, position);
        if (position > start) this.segments.add(point, position - 1);
      }
    }
  }

  /** The tracks walked from every track next to the point, every branch followed. */
  reach(point: Point): Point[][] {
    const nearest = new Map<
      number,
      { position: number; d: number; t: number }
    >();
    for (const position of this.segments.around(point)) {
      const track = this.trackOf[position];
      const foot = project(point, this.at(position), this.at(position + 1));
      const best = nearest.get(track);
      if (foot.d <= TRACK_MAX_M && (!best || foot.d < best.d)) {
        nearest.set(track, { position, ...foot });
      }
    }
    if (nearest.size === 0) return [];
    const closest = Math.min(...[...nearest.values()].map((f) => f.d));
    const lines: Point[][] = [];
    for (const [track, f] of nearest) {
      if (f.d > closest + TRACK_SLACK_M) continue;
      const [a, b] = [this.at(f.position), this.at(f.position + 1)];
      const foot = lerp(a, b, f.t);
      const seen = new Set<number>();
      for (const [end, position, dir] of [
        [b, f.position + 1, 1],
        [a, f.position, -1],
      ] as const) {
        const reach = metersBetween(foot, end);
        if (reach >= RAIL_REACH_M) {
          lines.push([foot, lerp(foot, end, RAIL_REACH_M / reach)]);
        } else {
          lines.push([foot, end]);
          this.walk(track, position, dir, RAIL_REACH_M - reach, lines, seen);
        }
      }
    }
    return lines;
  }

  private at(position: number): Point {
    return this.data.nodes.point(this.data.tracks.nodes[position]);
  }

  /** Walks `budget` metres from `position` of `track` in direction `dir`, then on every way met. */
  private walk(
    track: number,
    position: number,
    dir: 1 | -1,
    budget: number,
    out: Point[][],
    seen: Set<number>,
  ): void {
    const { starts, nodes } = this.data.tracks;
    const line: Point[] = [this.at(position)];
    let left = budget;
    let j = position;
    while (left > 0) {
      const k = j + dir;
      if (k < starts[track] || k >= starts[track + 1]) break;
      const [a, b] = [this.at(j), this.at(k)];
      const length = metersBetween(a, b);
      if (length >= left) {
        line.push(lerp(a, b, left / length));
        left = 0;
        break;
      }
      line.push(b);
      left -= length;
      j = k;
    }
    if (line.length > 1) out.push(line);
    if (left <= 0) return;
    // End of the way: carry on along every other way through this node,
    // never back along a way already walked from it.
    const through = this.nodeTracks.get(nodes[j]) ?? [];
    const fresh = through.filter(
      (next) => this.trackOf[next] !== track && !seen.has(next),
    );
    for (const next of through) seen.add(next);
    for (const next of fresh) {
      for (const d of [1, -1] as const) {
        this.walk(this.trackOf[next], next, d, left, out, seen);
      }
    }
  }
}

/** The zone inputs of the kept stations, given by their indexes. */
export function stationZones(data: RailwayData, kept: number[]): ZoneInput[] {
  const { features, stopAreas } = data.features;
  const stations = data.stations;
  const keptIndex = new CellIndex<number>();
  for (const s of kept) keptIndex.add(stations[s].point, s);

  // Each platform belongs to the nearest kept station within PLATFORM_RADIUS_M.
  const platformsOf = new Map<number, Set<ZoneFeature>>();
  const nearby = new CellIndex<ZoneFeature>();
  const byKey = new Map<string, ZoneFeature>();
  for (const f of features) {
    byKey.set(f.key, f);
    for (const v of vertices(f)) nearby.add(v, f);
    if (!f.platform) continue;
    let best: { s: number; d: number } | null = null;
    for (const s of keptIndex.around(vertices(f)[0])) {
      // To its lines, not only its nodes: a long platform may have two.
      const d = distanceTo(f, stations[s].point);
      if (!best || d < best.d) best = { s, d };
    }
    if (best && best.d <= PLATFORM_RADIUS_M) {
      const set = platformsOf.get(best.s) ?? new Set();
      set.add(f);
      platformsOf.set(best.s, set);
    }
  }

  // The platforms of the stop areas of a station (or of a station merged into it).
  const keptOf = new Map<number, number>();
  stations.forEach((station, index) => {
    const root = station.exclusion === null ? index : station.mergedInto;
    if (root !== null) keptOf.set(station.osmId, root);
  });
  for (const members of stopAreas) {
    const roots = new Set(
      members.flatMap((m) =>
        m[0] === 'n' && keptOf.has(Number(m.slice(1)))
          ? [keptOf.get(Number(m.slice(1)))!]
          : [],
      ),
    );
    for (const s of roots) {
      for (const m of members) {
        const f = byKey.get(m);
        if (!f?.platform) continue;
        const d = distanceTo(f, stations[s].point);
        // A stop area may hold a far bus station: train features next to the station only.
        if (d > STOP_AREA_RADIUS_M) continue;
        const set = platformsOf.get(s) ?? new Set();
        set.add(f);
        platformsOf.set(s, set);
      }
    }
  }

  const walker = new TrackWalker(
    data,
    kept.map((s) => stations[s].point),
  );
  return kept.map((s) => {
    const point = stations[s].point;
    const platforms = [...(platformsOf.get(s) ?? [])];
    // Never an untagged building holding the node: Auber would take the Opéra Garnier.
    const buildings = [...nearby.around(point)].filter((b) =>
      b.stationBuilding
        ? distanceTo(b, point) <= BUILDING_RADIUS_M
        : b.roof && platforms.length > 0 && near(b, platforms, ROOF_RADIUS_M),
    );
    const clusters = platformGroups(platforms)
      .map((group) => group.flatMap((p) => (p.key[0] === 'n' ? [] : p.parts)))
      .filter((lines) => lines.length > 0);
    const zone = {
      station: s,
      clusters,
      buildings: buildings.map((b) => b.parts[0]),
      rails: walker.reach(point),
    };
    return { ...zone, source: zoneSource(zone) };
  });
}

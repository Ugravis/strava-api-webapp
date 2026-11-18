import type { OplMember, Tags } from './osm-opl';
import {
  isPlatformRoof,
  isStationBuilding,
  isTrainPlatform,
  isUnderground,
} from './railway-rules';
import { Column, float64, int32, uint8 } from './columns';
import {
  type NodeStore,
  osmKey,
  type RailwayData,
  TUNNEL_TRACK,
  UNDERGROUND_TRACK,
} from './railway-data';
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
/** A platform belongs to a station only with a passenger track of its level this close: not a metro one. */
export const PLATFORM_TRACK_M = 15;
/** Tracks this close to the platforms or to the walked tracks may be taken into the zone. */
export const TRACK_NEAR_M = 40;
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
  /** Lines and rings of its platforms at the surface, then under the ground. */
  levels: [Point[][], Point[][]];
  /** Rings of the station buildings and of the roofs over its platforms, at the surface. */
  buildings: Point[][];
  /** The tracks walked from the point. */
  rails: Point[][];
  /** Zone tracks near the platforms and the walked tracks, in the open… */
  tracks: Point[][];
  /** …and in tunnels: only the underground platforms and the walked tracks take them. */
  tunnels: Point[][];
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
  /**
   * Ways far from every station known when read, as runs of node indexes:
   * a station mapped as a way may come later and be near them.
   */
  private readonly pendingIds = new Column(float64(1 << 16), float64);
  private readonly pendingStarts = new Column(int32(1 << 16), int32);
  private readonly pendingNodes = new Column(int32(1 << 20), int32);
  /** What each pending way may be, as `kindsOf` bits: its tags would weigh. */
  private readonly pendingKinds = new Column(uint8(1 << 16), uint8);
  private pending = true;

  constructor(
    private readonly nodes: NodeStore,
    private readonly candidatePoints: () => Point[],
  ) {}

  addNode(id: number, tags: Tags | null, point: Point): void {
    if (!isTrainPlatform(tags)) return;
    this.features.push(feature(`n${id}`, kindsOf(tags), [[point]]));
  }

  addWay(id: number, tags: Tags | null, refs: number[]): void {
    const indexes = refs
      .map((ref) => this.nodes.indexOf(ref))
      .filter((index) => index !== -1);
    if (indexes.length < 2) return;
    const line = indexes.map((index) => this.nodes.point(index));
    const kinds = kindsOf(tags);
    if (this.nearCandidate(line)) {
      this.keepWay(id, kinds, line);
      return;
    }
    this.pendingIds.push(id);
    this.pendingStarts.push(this.pendingNodes.length);
    for (const index of indexes) this.pendingNodes.push(index);
    this.pendingKinds.push(kinds);
  }

  /** Keeps the pending ways near the stations known once every way is read. */
  private resolvePending(): void {
    if (!this.pending) return;
    this.pending = false;
    this.candidates = null;
    const ids = this.pendingIds.values();
    const starts = this.pendingStarts.values();
    const nodes = this.pendingNodes.values();
    const kinds = this.pendingKinds.values();
    for (let i = 0; i < ids.length; i++) {
      const end = i + 1 < ids.length ? starts[i + 1] : nodes.length;
      const line: Point[] = [];
      for (let p = starts[i]; p < end; p++)
        line.push(this.nodes.point(nodes[p]));
      if (this.nearCandidate(line)) this.keepWay(ids[i], kinds[i], line);
    }
  }

  private keepWay(id: number, kinds: number, line: Point[]): void {
    this.ways.set(id, line);
    if (kinds & (PLATFORM | STATION_BUILDING | ROOF))
      this.features.push(feature(`w${id}`, kinds, [line]));
  }

  addRelation(id: number, tags: Tags | null, members: OplMember[]): void {
    this.resolvePending();
    if (!isTrainPlatform(tags)) return;
    const parts = members.flatMap((member) => {
      const line = member.type === 'w' ? this.ways.get(member.id) : undefined;
      return line ? [line] : [];
    });
    if (parts.length > 0)
      this.features.push(feature(`r${id}`, kindsOf(tags), parts));
  }

  addStopArea(members: OplMember[]): void {
    this.resolvePending();
    this.stopAreas.push(
      members
        .filter((member) => member.type !== 'r')
        .map((member) => `${member.type}${member.id}`),
    );
  }

  finish(): ZoneFeatures {
    this.resolvePending();
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

const PLATFORM = 1;
const STATION_BUILDING = 2;
const ROOF = 4;
const UNDERGROUND = 8;

/** What an object may be for the zone of a station, as bits. */
function kindsOf(tags: Tags | null): number {
  return (
    (isTrainPlatform(tags) ? PLATFORM : 0) |
    (isStationBuilding(tags) ? STATION_BUILDING : 0) |
    (isPlatformRoof(tags) ? ROOF : 0) |
    (isUnderground(tags) ? UNDERGROUND : 0)
  );
}

function feature(key: string, kinds: number, parts: Point[][]): ZoneFeature {
  const way = key[0] === 'w';
  const building = way && isClosed(parts[0]);
  return {
    key,
    platform: (kinds & PLATFORM) !== 0,
    stationBuilding: building && (kinds & STATION_BUILDING) !== 0,
    roof: building && (kinds & ROOF) !== 0,
    underground: (kinds & UNDERGROUND) !== 0,
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

/** The cascade: the footprint when mapped, else the tracks, else the point. */
export function zoneSource(
  zone: Pick<ZoneInput, 'levels' | 'buildings' | 'rails'>,
): ZoneSource {
  if (
    zone.levels.some((lines) => lines.length > 0) ||
    zone.buildings.length > 0
  )
    return 'osm';
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

/** Distance in metres from a line (or a point) to segment `ab`, taken at the ends of both. */
function segmentDistance(part: Point[], a: Point, b: Point): number {
  if (part.length === 1) return project(part[0], a, b).d;
  let best = Infinity;
  for (let i = 0; i + 1 < part.length; i++) {
    best = Math.min(
      best,
      project(a, part[i], part[i + 1]).d,
      project(b, part[i], part[i + 1]).d,
      project(part[i], a, b).d,
      project(part[i + 1], a, b).d,
    );
  }
  return best;
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

  /**
   * Positions of the zone track segments within `radius` metres of `parts`
   * (lines, rings or points): the distance of two segments is taken at their ends.
   */
  segmentsNear(parts: Point[][], radius: number): number[] {
    const points = parts.flat();
    if (points.length === 0) return [];
    // A box around the parts, in degrees, to skip the far segments at once.
    const margin = radius / 111_000;
    const lat = Math.max(...points.map((p) => Math.abs(p[1])));
    const lonMargin = margin / Math.max(0.01, Math.cos((lat * Math.PI) / 180));
    const [west, east] = [
      Math.min(...points.map((p) => p[0])) - lonMargin,
      Math.max(...points.map((p) => p[0])) + lonMargin,
    ];
    const [south, north] = [
      Math.min(...points.map((p) => p[1])) - margin,
      Math.max(...points.map((p) => p[1])) + margin,
    ];
    const candidates = new Set<number>();
    for (const point of points)
      for (const position of this.segments.around(point))
        candidates.add(position);
    const near: number[] = [];
    for (const position of candidates) {
      const [a, b] = [this.at(position), this.at(position + 1)];
      if (Math.max(a[0], b[0]) < west || Math.min(a[0], b[0]) > east) continue;
      if (Math.max(a[1], b[1]) < south || Math.min(a[1], b[1]) > north)
        continue;
      if (parts.some((part) => segmentDistance(part, a, b) <= radius))
        near.push(position);
    }
    return near.sort((x, y) => x - y);
  }

  /** The level bits of the track of a segment (`Tracks.zone`). */
  levelOf(position: number): number {
    return this.data.tracks.zone[this.trackOf[position]];
  }

  /** Segments joined into lines where they follow each other on a track. */
  lines(positions: number[]): Point[][] {
    const out: Point[][] = [];
    let previous = -2;
    for (const position of positions) {
      if (
        position === previous + 1 &&
        this.trackOf[position] === this.trackOf[previous]
      ) {
        out[out.length - 1].push(this.at(position + 1));
      } else {
        out.push([this.at(position), this.at(position + 1)]);
      }
      previous = position;
    }
    return out;
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
  const keptOf = new Map<string, number>();
  stations.forEach((station, index) => {
    const root = station.exclusion === null ? index : station.mergedInto;
    if (root !== null) keptOf.set(osmKey(station), root);
  });
  for (const members of stopAreas) {
    const roots = new Set(
      members.flatMap((m) => {
        const root = keptOf.get(m);
        return root === undefined ? [] : [root];
      }),
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
    // A platform with no passenger track of its level beside it is a metro one
    // tagged as a train one (line 14 under Bibliothèque François Mitterrand).
    const platforms = [...(platformsOf.get(s) ?? [])].filter((p) =>
      walker
        .segmentsNear(p.parts, PLATFORM_TRACK_M)
        .some(
          (position) =>
            ((walker.levelOf(position) & UNDERGROUND_TRACK) !== 0) ===
            p.underground,
        ),
    );
    // Never an untagged building holding the node: Auber would take the Opéra Garnier;
    // never one under the ground (a metro hall): it does not show on the map.
    const buildings = [...nearby.around(point)].filter(
      (b) =>
        !b.underground &&
        (b.stationBuilding
          ? distanceTo(b, point) <= BUILDING_RADIUS_M
          : b.roof &&
            platforms.length > 0 &&
            near(b, platforms, ROOF_RADIUS_M)),
    );
    const rails = walker.reach(point);
    const level = (underground: boolean) =>
      platforms
        .filter((p) => p.underground === underground && p.key[0] !== 'n')
        .flatMap((p) => p.parts);
    const levels: [Point[][], Point[][]] = [level(false), level(true)];
    const near_ = walker.segmentsNear(
      [...levels[0], ...levels[1], ...rails],
      TRACK_NEAR_M,
    );
    const zone = {
      station: s,
      levels,
      buildings: buildings.map((b) => b.parts[0]),
      rails,
      tracks: walker.lines(
        near_.filter(
          (position) => (walker.levelOf(position) & TUNNEL_TRACK) === 0,
        ),
      ),
      tunnels: walker.lines(
        near_.filter(
          (position) => (walker.levelOf(position) & TUNNEL_TRACK) !== 0,
        ),
      ),
    };
    return { ...zone, source: zoneSource(zone) };
  });
}

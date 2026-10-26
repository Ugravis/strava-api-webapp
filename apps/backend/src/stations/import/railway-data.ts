import type { OplObject, Tags } from './osm-opl';
import {
  isPassengerTrack,
  isStationNode,
  isStopArea,
  isStopRole,
  isTrackWay,
  isTrainRoute,
  servesStationsNearby,
  type StationExclusion,
  stationExclusion,
} from './railway-rules';

/** Coordinates are stored as integers, like OpenStreetMap: 1e-7 degree, about 1 cm. */
const SCALE = 1e7;
/** A station this close to a stop or platform of a passenger route is served by it. */
export const SERVED_RADIUS_M = 300;
/**
 * A station served by no route but this close to a track that serves the
 * stations nearby is kept: the routes are not mapped everywhere.
 */
export const SERVED_TRACK_RADIUS_M = 150;
/**
 * Two kept stations this close are the same station mapped twice when
 * their names match or a stop area holds both.
 */
export const MERGE_RADIUS_M = 200;
const METERS_PER_DEGREE = 111_320;

/** `[lon, lat]`. */
export type Point = [number, number];

/** A `railway=station|halt` node of OpenStreetMap. */
export interface StationCandidate {
  osmId: number;
  name: string | null;
  point: Point;
  /** Null when kept as a train station. */
  exclusion: StationExclusion | null;
  /** What shows a kept station is served: a train route, or a track beside it. */
  servedBy: 'route' | 'track' | null;
  /** For a merged station: the index of the station it is merged into. */
  mergedInto: number | null;
}

/** Growable typed array. */
class Column<T extends Float64Array | Int32Array | Uint8Array> {
  length = 0;

  constructor(
    private data: T,
    private readonly make: (size: number) => T,
  ) {}

  push(value: number): void {
    if (this.length === this.data.length) {
      const grown = this.make(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    this.data[this.length++] = value;
  }

  get(i: number): number {
    return this.data[i];
  }

  /** The values, trimmed. */
  values(): T {
    return this.data.subarray(0, this.length) as T;
  }
}

const float64 = (size: number) => new Float64Array(size);
const int32 = (size: number) => new Int32Array(size);
const uint8 = (size: number) => new Uint8Array(size);

/** Nodes in the order of their ids, as osmium writes them. */
export class NodeStore {
  private readonly ids = new Column(float64(1 << 20), float64);
  private readonly lons = new Column(int32(1 << 20), int32);
  private readonly lats = new Column(int32(1 << 20), int32);

  get size(): number {
    return this.ids.length;
  }

  add(id: number, lon: number, lat: number): void {
    if (this.ids.length > 0 && id <= this.ids.get(this.ids.length - 1)) {
      throw new Error(`Nodes not sorted by id at node ${id}`);
    }
    this.ids.push(id);
    this.lons.push(Math.round(lon * SCALE));
    this.lats.push(Math.round(lat * SCALE));
  }

  /** Index of a node, or -1 when unknown. */
  indexOf(id: number): number {
    const ids = this.ids;
    let low = 0;
    let high = ids.length - 1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      const value = ids.get(middle);
      if (value === id) return middle;
      if (value < id) low = middle + 1;
      else high = middle - 1;
    }
    return -1;
  }

  lon(index: number): number {
    return this.lons.get(index) / SCALE;
  }

  lat(index: number): number {
    return this.lats.get(index) / SCALE;
  }

  point(index: number): Point {
    return [this.lon(index), this.lat(index)];
  }
}

/** Tracks as runs of node indexes: way `i` spans `nodes[starts[i]]` to `nodes[starts[i + 1] - 1]`. */
export interface Tracks {
  count: number;
  osmIds: Float64Array;
  starts: Int32Array;
  nodes: Int32Array;
  /** Whether passenger trains can run on each track. */
  passenger: Uint8Array;
}

/** What the import keeps of the railway of OpenStreetMap. */
export interface RailwayData {
  nodes: NodeStore;
  stations: StationCandidate[];
  tracks: Tracks;
}

/**
 * Reads the objects of a railway extract, in the order of osmium (nodes,
 * ways, relations, each by id), and keeps the stations, the tracks and what
 * the passenger train routes serve.
 */
export class RailwayDataBuilder {
  private readonly nodes = new NodeStore();
  private readonly candidates: (StationCandidate & { tags: Tags })[] = [];
  private readonly trackIds = new Column(float64(1 << 16), float64);
  private readonly trackStarts = new Column(int32(1 << 16), int32);
  private readonly trackNodes = new Column(int32(1 << 22), int32);
  /** Whether each track is open to passengers without being in a train route. */
  private readonly trackOpen = new Column(uint8(1 << 16), uint8);
  /** Whether each track serves the stations beside it, without a route. */
  private readonly trackServes = new Column(uint8(1 << 16), uint8);
  /** Another way referenced by a relation, such as a platform: its first node. */
  private readonly otherWays = new Map<number, number>();
  private readonly routeTracks = new Set<number>();
  /** `n123` or `w456`: the stops and platforms of the train routes. */
  private readonly routeStops = new Set<string>();
  private readonly routeStations = new Set<number>();
  private readonly stopAreas: string[][] = [];

  add(object: OplObject): void {
    switch (object.type) {
      case 'n':
        if (!Number.isFinite(object.lon) || !Number.isFinite(object.lat)) {
          return;
        }
        this.nodes.add(object.id, object.lon, object.lat);
        if (isStationNode(object.tags)) {
          this.candidates.push({
            osmId: object.id,
            name: object.tags!.name?.trim() || null,
            point: [object.lon, object.lat],
            exclusion: null,
            servedBy: null,
            mergedInto: null,
            tags: object.tags!,
          });
        }
        return;
      case 'w':
        this.addWay(object.id, object.tags, object.nodes);
        return;
      case 'r':
        if (isTrainRoute(object.tags)) {
          for (const member of object.members) {
            if (member.type === 'w' && !isStopRole(member.role)) {
              this.routeTracks.add(member.id);
            } else if (member.type !== 'r') {
              this.routeStops.add(`${member.type}${member.id}`);
              if (member.type === 'n') this.routeStations.add(member.id);
            }
          }
        } else if (isStopArea(object.tags)) {
          this.stopAreas.push(
            object.members
              .filter((member) => member.type !== 'r')
              .map((member) => `${member.type}${member.id}`),
          );
        }
        return;
    }
  }

  private addWay(id: number, tags: Tags | null, refs: number[]): void {
    if (!isTrackWay(tags)) {
      const first = refs.length > 0 ? this.nodes.indexOf(refs[0]) : -1;
      if (first !== -1) this.otherWays.set(id, first);
      return;
    }
    const start = this.trackNodes.length;
    for (const ref of refs) {
      const index = this.nodes.indexOf(ref);
      // A node outside the extract cuts nothing: the track goes on without it.
      if (index !== -1) this.trackNodes.push(index);
    }
    if (this.trackNodes.length - start < 2) {
      this.trackNodes.length = start;
      return;
    }
    this.trackIds.push(id);
    this.trackStarts.push(start);
    this.trackOpen.push(isPassengerTrack(tags!, false) ? 1 : 0);
    this.trackServes.push(servesStationsNearby(tags!) ? 1 : 0);
  }

  finish(): RailwayData {
    const count = this.trackIds.length;
    const osmIds = this.trackIds.values();
    const starts = new Int32Array(count + 1);
    starts.set(this.trackStarts.values());
    starts[count] = this.trackNodes.length;
    const passenger = this.trackOpen.values();
    for (let i = 0; i < count; i++) {
      if (this.routeTracks.has(osmIds[i])) passenger[i] = 1;
    }
    const tracks = {
      count,
      osmIds,
      starts,
      nodes: this.trackNodes.values(),
      passenger,
    };
    return {
      nodes: this.nodes,
      stations: this.classifyStations(tracks),
      tracks,
    };
  }

  /**
   * Keeps the candidates served by a passenger train route: a member of
   * one, in a stop area with one of its stops, or near one of its stops or
   * platforms. Where no route serves a candidate, a track beside it that
   * serves the stations nearby does.
   */
  private classifyStations(tracks: Tracks): StationCandidate[] {
    const servedByArea = new Set<number>();
    for (const members of this.stopAreas) {
      if (members.some((member) => this.routeStops.has(member))) {
        for (const member of members) {
          if (member[0] === 'n') servedByArea.add(Number(member.slice(1)));
        }
      }
    }
    const stopIndex = this.stopPointIndex();
    const stations = this.candidates.map(
      ({ tags, ...candidate }): StationCandidate => {
        const byRoute =
          this.routeStations.has(candidate.osmId) ||
          servedByArea.has(candidate.osmId);
        let exclusion = stationExclusion(tags);
        // A metro station shared with the trains, such as a station of a
        // suburban network tagged as both.
        if (exclusion === 'not_train' && byRoute) exclusion = null;
        const served =
          byRoute || stopIndex.hasPointNear(candidate.point, SERVED_RADIUS_M);
        return {
          ...candidate,
          exclusion: exclusion ?? (served ? null : 'not_served'),
          servedBy: exclusion === null && served ? 'route' : null,
        };
      },
    );
    const unserved = stations.filter(
      (station) => station.exclusion === 'not_served',
    );
    for (const station of this.nearServingTracks(unserved, tracks)) {
      station.exclusion = null;
      station.servedBy = 'track';
    }
    this.mergeDuplicates(stations);
    return stations;
  }

  /**
   * Merges the kept stations mapped twice: within `MERGE_RADIUS_M`, with
   * the same name, one name holding the other (`Brienz`, `Brienz BRB`), or
   * in the same stop area. The station kept is the one served by a route,
   * then the one with the shortest name.
   */
  private mergeDuplicates(stations: StationCandidate[]): void {
    const areasOf = new Map<number, number[]>();
    this.stopAreas.forEach((members, area) => {
      for (const member of members) {
        if (member[0] !== 'n') continue;
        const id = Number(member.slice(1));
        const areas = areasOf.get(id);
        if (areas) areas.push(area);
        else areasOf.set(id, [area]);
      }
    });
    const names = stations.map((station) => normalizedName(station.name));
    const kept = stations.flatMap((station, index) =>
      station.exclusion === null ? [index] : [],
    );
    const index = new Map<string, number[]>();
    for (const station of kept) {
      const key = PointIndex.key(...stations[station].point);
      const cell = index.get(key);
      if (cell) cell.push(station);
      else index.set(key, [station]);
    }
    const parent = new Map<number, number>();
    const root = (station: number): number => {
      let current = station;
      while (parent.has(current)) current = parent.get(current)!;
      return current;
    };
    const rank = (station: number): [number, number, number] => [
      stations[station].servedBy === 'route' ? 0 : 1,
      names[station] === null ? Infinity : names[station].length,
      stations[station].osmId,
    ];
    const before = (p: number, q: number): boolean => {
      const [a, b] = [rank(p), rank(q)];
      const i = a.findIndex((value, j) => value !== b[j]);
      return i !== -1 && a[i] < b[i];
    };
    for (const a of kept) {
      const [lon, lat] = stations[a].point;
      const cx = PointIndex.cell(lon);
      const cy = PointIndex.cell(lat);
      for (let x = cx - 1; x <= cx + 1; x++) {
        for (let y = cy - 1; y <= cy + 1; y++) {
          for (const b of index.get(`${x}/${y}`) ?? []) {
            if (b <= a) continue;
            if (
              metersBetween(stations[a].point, stations[b].point) >
              MERGE_RADIUS_M
            ) {
              continue;
            }
            const sameArea = (areasOf.get(stations[a].osmId) ?? []).some(
              (area) => (areasOf.get(stations[b].osmId) ?? []).includes(area),
            );
            if (!sameArea && !namesMatch(names[a], names[b])) continue;
            const [ra, rb] = [root(a), root(b)];
            if (ra === rb) continue;
            if (before(ra, rb)) parent.set(rb, ra);
            else parent.set(ra, rb);
          }
        }
      }
    }
    for (const station of parent.keys()) {
      stations[station].exclusion = 'merged';
      stations[station].mergedInto = root(station);
    }
  }

  /** The stations within `SERVED_TRACK_RADIUS_M` of a track serving the stations nearby. */
  private nearServingTracks(
    stations: StationCandidate[],
    tracks: Tracks,
  ): Set<StationCandidate> {
    const index = new Map<string, StationCandidate[]>();
    for (const station of stations) {
      const key = PointIndex.key(station.point[0], station.point[1]);
      const cell = index.get(key);
      if (cell) cell.push(station);
      else index.set(key, [station]);
    }
    const near = new Set<StationCandidate>();
    if (index.size === 0) return near;
    const serves = this.trackServes.values();
    for (let track = 0; track < tracks.count; track++) {
      if (!serves[track]) continue;
      for (
        let position = tracks.starts[track];
        position < tracks.starts[track + 1] - 1;
        position++
      ) {
        const a = this.nodes.point(tracks.nodes[position]);
        const b = this.nodes.point(tracks.nodes[position + 1]);
        // Cells of about 1 km: the neighbor cells cover the radius.
        const x0 = PointIndex.cell(Math.min(a[0], b[0])) - 1;
        const x1 = PointIndex.cell(Math.max(a[0], b[0])) + 1;
        const y0 = PointIndex.cell(Math.min(a[1], b[1])) - 1;
        const y1 = PointIndex.cell(Math.max(a[1], b[1])) + 1;
        for (let x = x0; x <= x1; x++) {
          for (let y = y0; y <= y1; y++) {
            for (const station of index.get(`${x}/${y}`) ?? []) {
              if (
                !near.has(station) &&
                project(station.point, a, b).d <= SERVED_TRACK_RADIUS_M
              ) {
                near.add(station);
              }
            }
          }
        }
      }
    }
    return near;
  }

  private stopPointIndex(): PointIndex {
    const index = new PointIndex();
    for (const stop of this.routeStops) {
      const id = Number(stop.slice(1));
      const node =
        stop[0] === 'n'
          ? this.nodes.indexOf(id)
          : (this.otherWays.get(id) ?? -1);
      if (node !== -1) index.add(this.nodes.point(node));
    }
    return index;
  }
}

export function metersBetween(
  [lon1, lat1]: Point,
  [lon2, lat2]: Point,
): number {
  const x = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(x, lat2 - lat1) * METERS_PER_DEGREE;
}

/** A name without case, accents nor punctuation, or null. */
export function normalizedName(name: string | null): string | null {
  const normalized = (name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  return normalized === '' ? null : normalized;
}

/** Words that name a station without telling it apart from another. */
const GENERIC_WORDS = new Set([
  'gare',
  'station',
  'halte',
  'bahnhof',
  'haltepunkt',
  'stazione',
  'estacion',
  'estacao',
  'railway',
]);
/** Up to this length, an extra word is taken as an abbreviation: RER, TGV, BRB, HzL… */
const ABBREVIATION_MAX = 4;

/**
 * Whether two normalized names are the same station: equal, or one holding
 * the other with only generic words or abbreviations besides (`Brienz` and
 * `Brienz BRB`, but not `Catford` and `Catford Bridge`).
 */
export function namesMatch(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const at = ` ${long} `.indexOf(` ${short} `);
  if (at === -1) return false;
  const rest = `${long.slice(0, at)} ${long.slice(at + short.length)}`
    .split(' ')
    .filter((word) => word !== '');
  return rest.every(
    (word) => word.length <= ABBREVIATION_MAX || GENERIC_WORDS.has(word),
  );
}

/** Points in cells of about 1 km, to find those near a point. */
export class PointIndex {
  private static readonly CELL_DEG = 0.01;
  private readonly cells = new Map<string, Point[]>();

  add(point: Point): void {
    const key = PointIndex.key(point[0], point[1]);
    const cell = this.cells.get(key);
    if (cell) cell.push(point);
    else this.cells.set(key, [point]);
  }

  hasPointNear([lon, lat]: Point, radiusM: number): boolean {
    const cos = Math.cos((lat * Math.PI) / 180);
    const cx = Math.floor(lon / PointIndex.CELL_DEG);
    const cy = Math.floor(lat / PointIndex.CELL_DEG);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const [plon, plat] of this.cells.get(`${x}/${y}`) ?? []) {
          const dx = (plon - lon) * cos * METERS_PER_DEGREE;
          const dy = (plat - lat) * METERS_PER_DEGREE;
          if (dx * dx + dy * dy <= radiusM * radiusM) return true;
        }
      }
    }
    return false;
  }

  static cell(degrees: number): number {
    return Math.floor(degrees / PointIndex.CELL_DEG);
  }

  static key(lon: number, lat: number): string {
    return `${PointIndex.cell(lon)}/${PointIndex.cell(lat)}`;
  }
}

/** Distance from `p` to the segment `a → b`, and share of the segment of the nearest point. */
export function project(
  p: Point,
  a: Point,
  b: Point,
): { d: number; t: number } {
  // Local plane around `p`, in meters: exact enough within a few hundred meters.
  const kx = METERS_PER_DEGREE * Math.cos((p[1] * Math.PI) / 180);
  const ax = (a[0] - p[0]) * kx;
  const ay = (a[1] - p[1]) * METERS_PER_DEGREE;
  const dx = (b[0] - p[0]) * kx - ax;
  const dy = (b[1] - p[1]) * METERS_PER_DEGREE - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return { d: Math.hypot(ax + dx * t, ay + dy * t), t };
}

import type { OplObject, Tags } from './osm-opl';
import {
  isPassengerTrack,
  isStationNode,
  isStopArea,
  isStopRole,
  isTrackWay,
  isTrainRoute,
  type StationExclusion,
  stationExclusion,
} from './railway-rules';

/** Coordinates are stored as integers, like OpenStreetMap: 1e-7 degree, about 1 cm. */
const SCALE = 1e7;
/** A station this close to a stop or platform of a passenger route is served by it. */
export const SERVED_RADIUS_M = 300;
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
    return {
      nodes: this.nodes,
      stations: this.classifyStations(),
      tracks: {
        count,
        osmIds,
        starts,
        nodes: this.trackNodes.values(),
        passenger,
      },
    };
  }

  /**
   * Keeps the candidates served by a passenger train route: a member of
   * one, in a stop area with one of its stops, or near one of its stops or
   * platforms.
   */
  private classifyStations(): StationCandidate[] {
    const servedByArea = new Set<number>();
    for (const members of this.stopAreas) {
      if (members.some((member) => this.routeStops.has(member))) {
        for (const member of members) {
          if (member[0] === 'n') servedByArea.add(Number(member.slice(1)));
        }
      }
    }
    const stopIndex = this.stopPointIndex();
    return this.candidates.map(({ tags, ...candidate }) => {
      const exclusion = stationExclusion(tags);
      const served =
        this.routeStations.has(candidate.osmId) ||
        servedByArea.has(candidate.osmId) ||
        stopIndex.hasPointNear(candidate.point, SERVED_RADIUS_M);
      return {
        ...candidate,
        exclusion: exclusion ?? (served ? null : 'not_served'),
      };
    });
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

  private static key(lon: number, lat: number): string {
    return `${Math.floor(lon / PointIndex.CELL_DEG)}/${Math.floor(lat / PointIndex.CELL_DEG)}`;
  }
}

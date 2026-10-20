import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Position,
} from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import {
  brake,
  guardWhistle,
  horn,
  setTrainRolling,
} from "@/lib/sound/train-sound";
import { trainSpeed } from "@/lib/trains/train-speed";
import {
  SELECTED_SUFFIX,
  TRAIN_BLOCKS,
  TRAIN_PARTS,
  type TrainPart,
} from "./station-icons";
import type { LinkEnd, LinkProperties } from "./stations-layer";

/** Source of the trains, drawn by the stations layer. */
export const TRAINS_SOURCE = "station-trains";
/** Zoom from which the trains show, as plain blocks. */
export const TRAINS_MIN_ZOOM = 9;
/** Zoom from which each train shows its vehicles instead of its block. */
export const TRAINS_DETAIL_ZOOM = 12;
/** Marks the moves of the camera following a train: the handlers of the user's moves ignore them. */
export const TRAIN_FOLLOW_EVENT = "trainFollow";

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const METRES_PER_DEGREE = 111_320;
/** Ground covered by one CSS pixel of the images of the trains at their real size, in metres. */
const METRES_PER_IMAGE_PX = 1.25;
/** Size of the trains zoomed out: they never shrink below it. */
const MIN_TRAIN_SIZE = 1.1;
/** Latitude of the real scale, mid France: a style expression cannot read the latitude. */
const REFERENCE_LATITUDE = 46.5;
const MAX_SCALE_ZOOM = 24;

function metresPerPixelAt(zoom: number, latitude: number): number {
  return (
    (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) /
    (512 * 2 ** zoom)
  );
}

/**
 * Zoom from which the trains and the rails are drawn at their real size,
 * growing with the buildings; zoomed out, they keep their size.
 */
export const REAL_SCALE_ZOOM = Math.log2(
  (EARTH_CIRCUMFERENCE_M *
    Math.cos((REFERENCE_LATITUDE * Math.PI) / 180) *
    MIN_TRAIN_SIZE) /
    (512 * METRES_PER_IMAGE_PX),
);

type Stop = [zoom: number, value: number];

/** The stops of `realScale(stops)`: those below the real scale, then doubling with each zoom level. */
function realScaleStops(stops: Stop[]): Stop[] {
  const below = stops.filter(([zoom]) => zoom < REAL_SCALE_ZOOM);
  const [z0, v0] = below[below.length - 1];
  const next = stops.find(([zoom]) => zoom >= REAL_SCALE_ZOOM);
  const atScale = next
    ? v0 + ((next[1] - v0) * (REAL_SCALE_ZOOM - z0)) / (next[0] - z0)
    : v0;
  return [
    ...below,
    [REAL_SCALE_ZOOM, atScale],
    [MAX_SCALE_ZOOM, atScale * 2 ** (MAX_SCALE_ZOOM - REAL_SCALE_ZOOM)],
  ];
}

/**
 * A size by zoom from `stops` (increasing zooms), up to the real scale, then
 * doubling with each zoom level as the ground does.
 */
export function realScale(stops: Stop[]): ExpressionSpecification {
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    ...realScaleStops(stops).flat(),
  ] as ExpressionSpecification;
}

/** Size of the images of the trains. */
export const TRAIN_SIZE = realScale([[0, MIN_TRAIN_SIZE]]);

/** Size of the trains at `zoom`, as drawn by `TRAIN_SIZE`. */
function sizeAt(zoom: number): number {
  return MIN_TRAIN_SIZE * 2 ** Math.max(0, zoom - REAL_SCALE_ZOOM);
}

/** At most this many trains on the whole network beyond the first of each railway. */
const MAX_TRAINS = 80;
/** On each railway, one train for each such length of track, in metres, at most one by station and so many. */
const RAILWAY_M_PER_TRAIN = 10_000;
/** A railway shorter than this, in metres, has a single train. */
const SHORT_RAILWAY_M = 8_000;
const MAX_TRAINS_PER_RAILWAY = 14;
/** About 30 frames a second: smooth enough for a train, half the work of the screen rate. */
const FRAME_MS = 1000 / 30;
/** Room kept free before and behind each train, in metres: two trains never touch. */
const SAFETY_M = 300;
/** Length of the blocks of signalling a track is cut into, in metres: a train holds whole blocks. */
const BLOCK_M = 1000;
/** Slowest speed while closing on a stop, in metres a second: a train always ends up there. */
const CREEP_M_S = 2;
/** Stop at a station, in milliseconds of the trains' time. */
const DWELL_MS = 5000;
/** Stop at the end of the journey before the way back, in milliseconds of the trains' time. */
const TERMINUS_DWELL_MS = 8000;
/** Stop before going back from a track taken, in milliseconds of the trains' time. */
const TURN_DWELL_MS = 2500;
/** Wait for a track taken by another train before going back, in milliseconds of the trains' time. */
const WAIT_MS = 20_000;
/** How long before leaving the guard may blow the whistle, in milliseconds, and how often. */
const WHISTLE_BEFORE_MS = 1800;
const WHISTLE_CHANCE = 0.5;
/** How often missing trains are put on the network, in milliseconds. */
const SPAWN_EVERY_MS = 1000;
/** Places drawn at random for a new train: it goes to the one farthest from the others, spread but not on a grid. */
const SPAWN_CANDIDATES = 4;
/** Gap between two vehicles, in CSS pixels before the size of the trains. */
const COUPLING_PX = 1.2;
/** Time constant of the camera catching up with the train it follows, in seconds. */
const FOLLOW_S = 0.35;
/** Part of the view added around it where trains are still drawn: they enter it already there. */
const VIEW_MARGIN = 0.2;
/** Shortest journey of a TGV, in metres: shorter, a TER runs instead. */
const TGV_MIN_M = 30_000;
/** Chance of an Intercités stopping at a station that is neither an end nor a junction. */
const INTERCITES_STOP_CHANCE = 0.4;

interface KindSpec {
  kmh: number;
  /** Acceleration and braking, in metres a second squared. */
  accel: number;
  /** The driving vehicle at each end. */
  cab: TrainPart;
  /** The vehicles between, at least and at most. */
  part: TrainPart;
  cars: readonly [number, number];
  seatsPerCar: number;
  number: readonly [number, number];
}

const KINDS = {
  ter: {
    kmh: 140,
    accel: 1.1,
    cab: "terCab",
    part: "car",
    cars: [1, 3],
    seatsPerCar: 70,
    number: [800_000, 899_999],
  },
  intercites: {
    kmh: 180,
    accel: 0.9,
    cab: "intercitesCab",
    part: "car",
    cars: [2, 6],
    seatsPerCar: 80,
    number: [3_000, 4_999],
  },
  tgv: {
    kmh: 300,
    accel: 0.8,
    cab: "tgvCab",
    part: "car",
    cars: [3, 8],
    seatsPerCar: 60,
    number: [6_000, 9_999],
  },
  freight: {
    kmh: 100,
    accel: 0.4,
    cab: "freightCab",
    part: "wagon",
    cars: [2, 10],
    seatsPerCar: 0,
    number: [40_000, 69_999],
  },
  local: {
    kmh: 100,
    accel: 1.2,
    cab: "localCab",
    part: "car",
    cars: [1, 1],
    seatsPerCar: 60,
    number: [860_000, 869_999],
  },
} as const satisfies Record<string, KindSpec>;
export type TrainKind = keyof typeof KINDS;

/**
 * What a train serves: a whole railway from one end to the other, the
 * stretch between two junctions, or a few stations in a row.
 */
type Service = "line" | "junction" | "local";
const SERVICES: Record<Service, number> = {
  line: 0.4,
  junction: 0.35,
  local: 0.25,
};
/** Shortest and longest local service, in links. */
const LOCAL_LINKS = [1, 3] as const;

/** What a freight train may carry. */
export const CARGOES = [
  "wheat",
  "aggregates",
  "chemicals",
  "containers",
  "logs",
  "cars",
  "steel",
  "fuel",
] as const;
export type Cargo = (typeof CARGOES)[number];

type Bounds = [west: number, south: number, east: number, north: number];

/** An unlocked link, measured once: a track between two stations. */
interface Edge {
  index: number;
  coords: Position[];
  /** Distance from the start to each point, in metres. */
  along: number[];
  length: number;
  start: LinkEnd;
  end: LinkEnd;
  /** The railway the link belongs to: links joined by their stations share one. */
  line: number;
  /** Blocks of signalling each track is cut into. */
  blocks: number;
}

/** A link of a route, in its direction of travel. */
interface Step {
  edge: Edge;
  forward: boolean;
}

/** Links joined end to end through their stations. */
interface Route {
  steps: Step[];
  length: number;
}

/** Where a new train would run, and how far it would be from the others, in metres. */
interface Placement {
  kind: TrainKind;
  count: number;
  path: Path;
  stopsAt: Set<number>;
  at: number;
  span: number;
  room: number;
}

/** What runs on a railway: its routes, and how many trains it should have. */
interface Railway {
  /** From an end of the railway to a far end. */
  lines: Route[];
  /** Between two stations that are ends or junctions, through the others. */
  chains: Route[];
  /** Stations along it: never more trains than these. */
  stations: number;
  length: number;
  target: number;
}

/** A link on the path of a train, in its direction of travel. */
interface Leg extends Step {
  /** Distance along the path where the leg starts, in metres. */
  from: number;
  /** Whether the train stops at the station ending the leg. */
  stop: boolean;
}

/** The journey of a train, legs joined end to end. */
interface Path {
  legs: Leg[];
  coords: Position[];
  along: number[];
  length: number;
}

/** A vehicle of a train; `reversed` when it runs backwards, as the driving vehicle at the rear. */
interface Vehicle {
  part: TrainPart;
  reversed: boolean;
  /** Middle of the vehicle. */
  position: Position;
  bearing: number;
  /**
   * Where its image is anchored: the point of the vehicle nearest the middle
   * of the view, the image shifted by `offset` image pixels along it. Zoomed
   * far in, an image whose anchor lies off screen would not be drawn.
   */
  anchor: Position;
  offset: number;
}

type Phase = "run" | "stop" | "turn";

interface Train {
  id: number;
  kind: TrainKind;
  number: number;
  line: number;
  path: Path;
  /** Stations the train stops at, by id; it always stops at the end of its journey. */
  stopsAt: Set<number>;
  /** Distance of the front of the train along its path, in metres. */
  at: number;
  /** Legs whose station the train has reached. */
  reached: number;
  /** When the train left the start of its journey and reached the station ending each leg, in milliseconds since the epoch. */
  departedAt: number;
  times: number[];
  /** Track the train keeps for itself, in metres: its longest drawn length, at the detail zoom. */
  span: number;
  /** Speed, in metres a second: the same whatever the zoom. */
  speed: number;
  phase: Phase;
  /** End of the stop, in milliseconds of the trains' time. */
  dwellUntil: number;
  whistled: boolean;
  /** Since when the train waits for a track taken, in milliseconds of the trains' time; 0 while it does not. */
  waitingSince: number;
  /** From the front to the rear. */
  vehicles: Vehicle[];
  /** Where the block of the train is drawn zoomed out, and its heading. */
  block: { position: Position; bearing: number };
  /** Blocks of track the train holds, by key. */
  held: Set<string>;
  passengers: number;
  cargo: Cargo | null;
  tonnes: number;
  delayMin: number;
  /** Whether the train is in view. */
  seen: boolean;
}

/** A station where a train stops, with when it did or should. */
export interface TrainStop {
  station: LinkEnd;
  /** Milliseconds since the epoch: when the train left it, reached it, or is expected there. */
  time: number;
  passed: boolean;
}

/** What the panel tells of a train. */
export interface TrainInfo {
  id: number;
  kind: TrainKind;
  number: number;
  /** Where the journey started, the next stop and where it ends. */
  origin: LinkEnd;
  next: LinkEnd;
  terminus: LinkEnd;
  /** From the origin to the terminus. */
  stops: TrainStop[];
  vehicles: number;
  /** Null for a freight train. */
  passengers: number | null;
  seats: number | null;
  /** Null for a passenger train. */
  cargo: Cargo | null;
  tonnes: number | null;
  /** Speed at the real pace of the trains. */
  speedKmh: number;
  /** Distance left to the next stop, in metres. */
  remainingM: number;
  /** Trains on the same railway, this one included. */
  onLine: number;
  delayMin: number;
  dwelling: boolean;
  following: boolean;
}

const EMPTY: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [],
};

const random = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) =>
  Math.floor(random(min, max + 1));
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];
const cruise = (kind: TrainKind) => KINDS[kind].kmh / 3.6;
const startOf = (step: Step) =>
  step.forward ? step.edge.start : step.edge.end;
const endOf = (step: Step) => (step.forward ? step.edge.end : step.edge.start);
const legEnd = (leg: Leg) => leg.from + leg.edge.length;
/** A block of one track of a link: each way has its own track. */
const blockKey = (step: Step, block: number) =>
  `${step.edge.index}${step.forward ? "+" : "-"}${block}`;

/** One of `weights`' keys, picked at random by its weight. */
function weighted<K extends string>(
  weights: Partial<Record<K, number>>,
): K | null {
  const entries = Object.entries(weights) as [K, number][];
  let left = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, weight] of entries) {
    left -= weight;
    if (left < 0) return key;
  }
  return null;
}

function metres(a: Position, b: Position): number {
  const dx = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dx, b[1] - a[1]) * METRES_PER_DEGREE;
}

function toEdge({
  geometry,
  properties,
}: Feature<LineString, LinkProperties>): Edge | null {
  const coords = geometry.coordinates;
  if (coords.length < 2 || properties.start.id === properties.end.id)
    return null;
  const along = [0];
  for (let i = 1; i < coords.length; i++)
    along.push(along[i - 1] + metres(coords[i - 1], coords[i]));
  const length = along[along.length - 1];
  return {
    index: 0,
    coords,
    along,
    length,
    start: properties.start,
    end: properties.end,
    line: 0,
    blocks: Math.max(1, Math.round(length / BLOCK_M)),
  };
}

function toRoute(steps: Step[]): Route {
  return { steps, length: steps.reduce((sum, s) => sum + s.edge.length, 0) };
}

/** `route` the other way. */
function reversed(steps: Step[]): Step[] {
  return [...steps].reverse().map((s) => ({ ...s, forward: !s.forward }));
}

/** Joins `legs` end to end, setting where each starts. */
function buildPath(legs: Leg[]): Path {
  const coords: Position[] = [];
  const along: number[] = [];
  for (const leg of legs) {
    const points = leg.forward
      ? leg.edge.coords
      : [...leg.edge.coords].reverse();
    // The gap between two links at their station counts: a train crosses it.
    const gap =
      coords.length > 0 ? metres(coords[coords.length - 1], points[0]) : 0;
    leg.from = (along[along.length - 1] ?? 0) + gap;
    const { length } = leg.edge;
    for (let i = 0; i < points.length; i++) {
      coords.push(points[i]);
      along.push(
        leg.from +
          (leg.forward
            ? leg.edge.along[i]
            : length - leg.edge.along[points.length - 1 - i]),
      );
    }
  }
  return { legs, coords, along, length: along[along.length - 1] };
}

/** The point `at` metres along `path`, clamped to its ends. */
function pointAt({ coords, along, length }: Path, at: number): Position {
  const clamped = Math.min(Math.max(at, 0), length);
  let low = 0;
  let high = along.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (along[middle] <= clamped) low = middle;
    else high = middle;
  }
  const [a, b] = [coords[low], coords[high]];
  const span = along[high] - along[low];
  const t = span > 0 ? (clamped - along[low]) / span : 0;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Heading from `from` to `to`, in degrees clockwise from north. */
function bearing(from: Position, to: Position): number {
  const dx = (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180);
  return (Math.atan2(dx, to[1] - from[1]) * 180) / Math.PI;
}

/** Where along the segment from `from` to `to` the point nearest `point` lies, from 0 to 1. */
function nearestAlong(from: Position, to: Position, point: Position): number {
  const cos = Math.cos((from[1] * Math.PI) / 180);
  const ux = (to[0] - from[0]) * cos;
  const uy = to[1] - from[1];
  const squared = ux * ux + uy * uy;
  if (squared === 0) return 0.5;
  const t =
    ((point[0] - from[0]) * cos * ux + (point[1] - from[1]) * uy) / squared;
  return Math.min(1, Math.max(0, t));
}

function inside([lon, lat]: Position, bounds: Bounds): boolean {
  return (
    lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
  );
}

/** The kind of a train on a `service` of `length` metres. */
function kindFor(service: Service, length: number): TrainKind {
  const weights: Partial<Record<TrainKind, number>> =
    service === "line"
      ? {
          tgv: length >= TGV_MIN_M ? 2 : 0,
          intercites: 1.5,
          ter: 2,
          freight: 1.2,
        }
      : service === "junction"
        ? {
            ter: 3,
            intercites: length >= TGV_MIN_M ? 0.7 : 0,
            freight: 1,
            local: length < TGV_MIN_M / 2 ? 1.5 : 0.3,
          }
        : { local: 3, ter: 1 };
  return weighted(weights) ?? "ter";
}

/** Length of a train of `kind` with `cars` between its driving vehicles, in CSS pixels before the size of the trains. */
function lengthPx(kind: TrainKind, cars: number): number {
  const { cab, part } = KINDS[kind];
  return (
    2 * TRAIN_PARTS[cab].length +
    cars * TRAIN_PARTS[part].length +
    (cars + 1) * COUPLING_PX
  );
}

/** A driving vehicle at each end, the rear one backwards, and `cars` between. */
function consist(kind: TrainKind, cars: number): Vehicle[] {
  const { cab, part } = KINDS[kind];
  const vehicle = (part: TrainPart, reversed = false): Vehicle => ({
    part,
    reversed,
    position: [0, 0],
    bearing: 0,
    anchor: [0, 0],
    offset: 0,
  });
  return [
    vehicle(cab),
    ...Array.from({ length: cars }, () => vehicle(part)),
    vehicle(cab, true),
  ];
}

function seats({ kind, vehicles }: Train): number {
  return (vehicles.length - 2) * KINDS[kind].seatsPerCar;
}

/** Passengers aboard, from a few to slightly overbooked. */
function boarding(train: Train): number {
  return Math.round(seats(train) * random(0.15, 1.05));
}

/** Distance a train of `kind` needs to stop from its cruising speed, with the room kept free. */
function lookahead(kind: TrainKind): number {
  return cruise(kind) ** 2 / (2 * KINDS[kind].accel) + SAFETY_M + 50;
}

/** Time lost by `kind` stopping at a station and leaving again, beyond the dwell, in seconds. */
function stopLossS(kind: TrainKind): number {
  return cruise(kind) / KINDS[kind].accel;
}

/** A tiny binary heap of station ids by distance, for the shortest paths. */
class Queue {
  private items: [distance: number, id: number][] = [];

  get size(): number {
    return this.items.length;
  }

  push(distance: number, id: number): void {
    const items = this.items;
    items.push([distance, id]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }

  pop(): [number, number] {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l][0] < items[m][0]) m = l;
        if (r < items.length && items[r][0] < items[m][0]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Trains running over the unlocked railway, whether in view or not: the
 * user looks for them. Each runs a service on its railway (a whole line, the
 * stretch between two junctions or a few stations), stops where its kind
 * does, then goes back. Each way has its own track, cut into blocks of
 * signalling: a train holds those it covers and needs to stop, so trains
 * never overlap; one waiting too long goes back. The trains' time runs at
 * the speed picked by the user. The animation runs with the stations shown,
 * zoomed in enough and the tab visible, even while the map moves. A train
 * picked can be followed by the camera.
 */
export class TrainTraffic {
  private edges: Edge[] = [];
  /** The links at each station, by station id. */
  private nodes = new Map<number, Edge[]>();
  private railways: Railway[] = [];
  private trains: Train[] = [];
  /** Train holding each block of track, by key. */
  private owners = new Map<string, number>();
  private visible: boolean;
  private frame = 0;
  private lastFrame = 0;
  private lastSpawn = 0;
  /** The trains' own time, in milliseconds: it runs faster or slower than the clock. */
  private clock = 0;
  private nextId = 1;
  /** Whether the source is known empty: no data sent again while no train is seen. */
  private empty = false;
  private selected: number | null = null;
  private following = false;
  /** Whether the trains in view are heard: zoomed in enough to show their vehicles. */
  private audible = false;

  constructor(
    private readonly map: MapLibreMap,
    visible: boolean,
    /** Where on the map container the train followed should be, in pixels: beside the panel. */
    private readonly focusPoint: () => { x: number; y: number },
  ) {
    this.visible = visible;
    map.on("moveend", this.onMoveEnd);
    // Grabbed by the user, the map stops following the train: following, each
    // frame would cancel the drag before it starts.
    map.on("mousedown", this.stopFollowing);
    map.on("touchstart", this.stopFollowing);
    // A new style has an empty source: the trains are drawn again.
    map.on("style.load", this.redraw);
    document.addEventListener("visibilitychange", this.run);
  }

  /** Runs trains on `links`, replacing those of the previous links. */
  setLinks(links: FeatureCollection<LineString, LinkProperties>): void {
    this.edges = links.features.map(toEdge).filter((e) => e !== null);
    this.nodes = new Map();
    this.edges.forEach((e, index) => {
      e.index = index;
      for (const station of [e.start, e.end]) {
        const at = this.nodes.get(station.id);
        if (at) at.push(e);
        else this.nodes.set(station.id, [e]);
      }
    });
    this.railways = this.labelLines().map((edges) => this.toRailway(edges));
    this.shareTrains();
    this.trains = [];
    this.owners.clear();
    this.railways.forEach((railway, line) => {
      for (let attempt = 0; attempt < railway.target * 3; attempt++) {
        if (this.count(line) >= railway.target) break;
        this.spawn(line);
      }
    });
    this.run();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.run();
  }

  /** Marks the train shown in the panel, followed by the camera; null for none. */
  select(id: number | null): void {
    this.selected = id;
    this.following = id !== null;
    this.run();
    this.draw();
  }

  setFollowing(following: boolean): void {
    this.following = following && this.selected !== null;
    this.run();
  }

  info(id: number): TrainInfo | null {
    const train = this.trains.find((t) => t.id === id);
    if (!train) return null;
    const { legs } = train.path;
    const isFreight = train.kind === "freight";
    const stops = this.itinerary(train);
    const next = stops.find((s) => !s.passed) ?? stops[stops.length - 1];
    const nextLeg = legs.findIndex(
      (leg, i) => i >= train.reached && endOf(leg).id === next.station.id,
    );
    return {
      id,
      kind: train.kind,
      number: train.number,
      origin: startOf(legs[0]),
      next: next.station,
      terminus: endOf(legs[legs.length - 1]),
      stops,
      vehicles: train.vehicles.length,
      passengers: isFreight ? null : train.passengers,
      seats: isFreight ? null : seats(train),
      cargo: train.cargo,
      tonnes: isFreight ? train.tonnes : null,
      speedKmh: Math.round(train.speed * 3.6),
      remainingM:
        nextLeg < 0 ? 0 : Math.max(0, legEnd(legs[nextLeg]) - train.at),
      onLine: this.count(train.line),
      delayMin: train.delayMin,
      dwelling: train.phase !== "run",
      following: this.following && this.selected === id,
    };
  }

  destroy(): void {
    this.pause();
    this.map.off("moveend", this.onMoveEnd);
    this.map.off("mousedown", this.stopFollowing);
    this.map.off("touchstart", this.stopFollowing);
    this.map.off("style.load", this.redraw);
    document.removeEventListener("visibilitychange", this.run);
  }

  /** Numbers the railways, links joined through their stations sharing one: the links of each. */
  private labelLines(): Edge[][] {
    const done = new Set<number>();
    const lines: Edge[][] = [];
    for (const first of this.edges) {
      if (done.has(first.index)) continue;
      const line: Edge[] = [];
      const queue = [first];
      done.add(first.index);
      while (queue.length > 0) {
        const e = queue.pop()!;
        e.line = lines.length;
        line.push(e);
        for (const station of [e.start, e.end]) {
          for (const next of this.nodes.get(station.id) ?? []) {
            if (done.has(next.index)) continue;
            done.add(next.index);
            queue.push(next);
          }
        }
      }
      lines.push(line);
    }
    return lines;
  }

  /** Whether trains of a line branch or end at the station `id`: not one of two links. */
  private isJunction(id: number): boolean {
    return (this.nodes.get(id)?.length ?? 0) !== 2;
  }

  /**
   * The routes of the railway of `edges`: the chains of links between its
   * ends and junctions, and a few lines from an end to the farthest one.
   */
  private toRailway(edges: Edge[]): Railway {
    const keys = [
      ...new Set(
        edges
          .flatMap((e) => [e.start, e.end])
          .filter((s) => this.isJunction(s.id)),
      ),
    ];
    // A loop without ends: any station starts it.
    if (keys.length === 0) keys.push(edges[0].start);
    const chains: Route[] = [];
    const walked = new Set<number>();
    for (const key of keys) {
      for (const first of this.nodes.get(key.id) ?? []) {
        if (walked.has(first.index)) continue;
        const steps: Step[] = [];
        let edge = first;
        let station = key;
        for (;;) {
          walked.add(edge.index);
          const forward = edge.start.id === station.id;
          steps.push({ edge, forward });
          station = forward ? edge.end : edge.start;
          if (this.isJunction(station.id) || station.id === key.id) break;
          const next = this.nodes.get(station.id)!.find((e) => e !== edge);
          if (!next || walked.has(next.index)) break;
          edge = next;
        }
        chains.push(toRoute(steps));
      }
    }
    // Ends first: a line runs from one to the other.
    const ends = keys.filter((s) => (this.nodes.get(s.id)?.length ?? 0) === 1);
    const starts = (ends.length >= 2 ? ends : keys).slice();
    const lines: Route[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < 3 && starts.length > 0; i++) {
      const start = starts.splice(
        Math.floor(Math.random() * starts.length),
        1,
      )[0];
      const line = this.farthest(start, ends.length >= 2 ? ends : keys);
      if (!line) continue;
      const a = startOf(line.steps[0]).id;
      const b = endOf(line.steps[line.steps.length - 1]).id;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(line);
    }
    return {
      lines: lines.length > 0 ? lines : chains,
      chains,
      stations: new Set(edges.flatMap((e) => [e.start.id, e.end.id])).size,
      length: chains.reduce((sum, r) => sum + r.length, 0),
      target: 0,
    };
  }

  /** The shortest route from `start` to the farthest of `targets`, through the links; null when none is reached. */
  private farthest(start: LinkEnd, targets: LinkEnd[]): Route | null {
    const distance = new Map<number, number>([[start.id, 0]]);
    const via = new Map<number, Step>();
    const queue = new Queue();
    queue.push(0, start.id);
    while (queue.size > 0) {
      const [d, id] = queue.pop();
      if (d > (distance.get(id) ?? Infinity)) continue;
      for (const edge of this.nodes.get(id) ?? []) {
        const forward = edge.start.id === id;
        const other = (forward ? edge.end : edge.start).id;
        const through = d + edge.length;
        if (through >= (distance.get(other) ?? Infinity)) continue;
        distance.set(other, through);
        via.set(other, { edge, forward });
        queue.push(through, other);
      }
    }
    let end: LinkEnd | null = null;
    for (const target of targets)
      if (
        target.id !== start.id &&
        (distance.get(target.id) ?? 0) > (end ? distance.get(end.id)! : 0)
      )
        end = target;
    if (!end) return null;
    const steps: Step[] = [];
    for (let id = end.id; id !== start.id;) {
      const step = via.get(id)!;
      steps.push(step);
      id = startOf(step).id;
    }
    return toRoute(steps.reverse());
  }

  /**
   * Trains each railway should have: one at least, the only one on a short
   * railway, more on longer ones but never more than its stations, a few in
   * all.
   */
  private shareTrains(): void {
    const extras = this.railways.map(({ length, stations }) =>
      length < SHORT_RAILWAY_M
        ? 0
        : Math.min(
            MAX_TRAINS_PER_RAILWAY,
            stations,
            Math.ceil(length / RAILWAY_M_PER_TRAIN),
          ) - 1,
    );
    const total = extras.reduce((sum, n) => sum + n, 0);
    const share = total > MAX_TRAINS ? MAX_TRAINS / total : 1;
    this.railways.forEach((railway, i) => {
      railway.target = 1 + Math.floor(extras[i] * share);
    });
  }

  private count(line: number): number {
    let n = 0;
    for (const train of this.trains) if (train.line === line) n++;
    return n;
  }

  /** A route of `service` on `railway`: a local service is a few links of a chain. */
  private routeOf(railway: Railway, service: Service): Route {
    if (service === "line") return pick(railway.lines);
    const chain = pick(railway.chains);
    if (service === "junction") return chain;
    const links = Math.min(
      chain.steps.length,
      randomInt(LOCAL_LINKS[0], LOCAL_LINKS[1]),
    );
    const first = randomInt(0, chain.steps.length - links);
    return toRoute(chain.steps.slice(first, first + links));
  }

  /**
   * Stations a train of `kind` stops at along `steps`: everywhere, at the
   * ends and junctions only, or in between. The only train of its railway
   * stops everywhere: no station is left without one.
   */
  private stopsFor(
    kind: TrainKind,
    steps: Step[],
    everywhere: boolean,
  ): Set<number> {
    const stations = [startOf(steps[0]), ...steps.map(endOf)];
    const ends = [stations[0], stations[stations.length - 1]];
    const stops = new Set(ends.map((s) => s.id));
    for (const station of stations) {
      const junction = this.isJunction(station.id);
      if (
        everywhere ||
        kind === "ter" ||
        kind === "local" ||
        (kind === "intercites" &&
          (junction || Math.random() < INTERCITES_STOP_CHANCE)) ||
        (kind === "tgv" && junction)
      )
        stops.add(station.id);
    }
    return stops;
  }

  /** The legs of a journey over `steps`, stopping at `stopsAt`. */
  private journey(steps: Step[], stopsAt: Set<number>): Path {
    return buildPath(
      steps.map((step) => ({
        ...step,
        from: 0,
        stop: stopsAt.has(endOf(step).id),
      })),
    );
  }

  /** Keys of the blocks of `path` from `low` to `high`, in the order of travel, with where each starts. */
  private *blocks(
    path: Path,
    low: number,
    high: number,
  ): Generator<[key: string, start: number]> {
    for (const leg of path.legs) {
      if (legEnd(leg) < low) continue;
      if (leg.from > high) return;
      const { blocks, length } = leg.edge;
      const size = length / blocks;
      for (let i = 0; i < blocks; i++) {
        // Backwards, the blocks of the edge come last first.
        const block = leg.forward ? i : blocks - 1 - i;
        const start = leg.from + i * size;
        if (start + size < low) continue;
        if (start > high) return;
        yield [blockKey(leg, block), start];
      }
    }
  }

  private free(key: string, train: Train | null): boolean {
    const owner = this.owners.get(key);
    return owner === undefined || owner === train?.id;
  }

  /**
   * A place for a train on `line`: a random service and a kind fit for it,
   * with as many cars as the route holds, somewhere on it heading either way,
   * on free track; null when the track is taken. The only train of its
   * railway runs the whole line.
   */
  private place(line: number): Placement | null {
    const railway = this.railways[line];
    const alone = railway.target === 1;
    const service = alone ? "line" : (weighted(SERVICES) ?? "junction");
    const route = this.routeOf(railway, service);
    let kind = kindFor(service, route.length);
    // Stopping at every station, the only train carries passengers.
    if (alone && kind === "freight") kind = "ter";
    const metresPerPx =
      MIN_TRAIN_SIZE *
      metresPerPixelAt(TRAINS_DETAIL_ZOOM, route.steps[0].edge.coords[0][1]);
    const fitting = (k: TrainKind) =>
      Math.floor(
        (route.length / metresPerPx -
          2 * TRAIN_PARTS[KINDS[k].cab].length -
          COUPLING_PX) /
          (TRAIN_PARTS[KINDS[k].part].length + COUPLING_PX),
      );
    if (fitting(kind) < KINDS[kind].cars[0]) kind = "local";
    const { cars } = KINDS[kind];
    const count = Math.min(randomInt(cars[0], cars[1]), fitting(kind));
    if (count < cars[0]) return null;
    const span = lengthPx(kind, count) * metresPerPx;
    const margin = Math.min(SAFETY_M, (route.length - span) / 2);
    const steps = Math.random() < 0.5 ? route.steps : reversed(route.steps);
    const stopsAt = this.stopsFor(kind, steps, alone);
    const path = this.journey(steps, stopsAt);
    // Anywhere on the route, the whole train on it, on free track.
    const at = random(margin + span, path.length - margin);
    for (const [key] of this.blocks(path, at - span - margin, at + margin))
      if (!this.free(key, null)) return null;
    return { kind, count, path, stopsAt, at, span, room: 0 };
  }

  /**
   * Puts a train on `line`, on the best of a few random places: the one
   * farthest from the other trains, which spreads them over the network.
   */
  private spawn(line: number): void {
    const others = this.trains.map((t) => pointAt(t.path, t.at));
    let best: Placement | null = null;
    for (let i = 0; i < SPAWN_CANDIDATES; i++) {
      const placement = this.place(line);
      if (!placement) continue;
      const position = pointAt(placement.path, placement.at);
      placement.room = Math.min(
        Infinity,
        ...others.map((other) => metres(position, other)),
      );
      if (!best || placement.room > best.room) best = placement;
    }
    if (!best) return;
    const { kind, count, path, stopsAt, at, span } = best;
    const { number } = KINDS[kind];
    const isFreight = kind === "freight";
    const train: Train = {
      id: this.nextId++,
      kind,
      number: randomInt(number[0], number[1]),
      line,
      path,
      stopsAt,
      at,
      reached: 0,
      departedAt: 0,
      times: [],
      span,
      speed: cruise(kind) * random(0.5, 1),
      phase: "run",
      dwellUntil: 0,
      whistled: false,
      waitingSince: 0,
      vehicles: consist(kind, count),
      block: { position: [0, 0], bearing: 0 },
      held: new Set(),
      passengers: 0,
      cargo: isFreight ? pick(CARGOES) : null,
      tonnes: isFreight ? Math.round(random(2.5, 6) * count) * 10 : 0,
      delayMin: Math.random() < 0.7 ? 0 : randomInt(1, 15),
      seen: false,
    };
    train.passengers = boarding(train);
    this.backdate(train);
    this.trains.push(train);
    this.reserve(train);
  }

  /** Sets when `train`, already on its way, left and passed the stations behind it, as if it ran at cruise. */
  private backdate(train: Train): void {
    const { legs } = train.path;
    train.reached = legs.findIndex((leg) => legEnd(leg) > train.at + 0.5);
    if (train.reached < 0) train.reached = legs.length;
    const v = cruise(train.kind);
    const pace = 1000 / trainSpeed();
    const now = Date.now();
    let seconds = 0;
    let at = train.at;
    train.times = [];
    for (let i = train.reached - 1; i >= 0; i--) {
      seconds += (at - legEnd(legs[i])) / v;
      at = legEnd(legs[i]);
      train.times[i] = now - seconds * pace;
      if (legs[i].stop) seconds += DWELL_MS / 1000 + stopLossS(train.kind);
    }
    train.departedAt = now - (seconds + at / v) * pace;
  }

  /** The stops of the journey of `train`, from its start to its end, with when it was or should be at each. */
  private itinerary(train: Train): TrainStop[] {
    const { legs } = train.path;
    const v = cruise(train.kind);
    const loss = stopLossS(train.kind) / 2;
    const pace = 1000 / trainSpeed();
    const now = Date.now();
    const stops: TrainStop[] = [
      { station: startOf(legs[0]), time: train.departedAt, passed: true },
    ];
    let seconds =
      train.phase === "run"
        ? 0
        : Math.max(0, train.dwellUntil - this.clock) / 1000;
    let at = train.at;
    legs.forEach((leg, i) => {
      const last = i === legs.length - 1;
      if (!leg.stop && !last) return;
      const station = endOf(leg);
      if (i < train.reached) {
        stops.push({ station, time: train.times[i], passed: true });
        return;
      }
      seconds += Math.max(0, legEnd(leg) - at) / v + loss;
      at = legEnd(leg);
      stops.push({ station, time: now + seconds * pace, passed: false });
      seconds += DWELL_MS / 1000 + loss;
    });
    return stops;
  }

  private active(): boolean {
    return (
      this.visible &&
      this.trains.length > 0 &&
      this.map.getZoom() >= TRAINS_MIN_ZOOM &&
      !document.hidden
    );
  }

  private readonly onMoveEnd = (event: object) => {
    if (!(TRAIN_FOLLOW_EVENT in event)) this.run();
  };

  private readonly stopFollowing = () => {
    this.following = false;
  };

  /** Runs the animation while it can be seen, stops it otherwise. */
  private readonly run = () => {
    if (!this.active()) {
      this.pause();
      return;
    }
    if (!this.frame) {
      this.lastFrame = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private readonly pause = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    setTrainRolling(0);
  };

  /**
   * Holds the blocks from behind `train` to as far as it needs to stop
   * ahead, on the track of its direction, releasing those left behind.
   * Returns how far the train may go: before the first block held by
   * another train.
   */
  private reserve(train: Train): number {
    const wanted = new Set<string>();
    let limit = Infinity;
    for (const [key, start] of this.blocks(
      train.path,
      train.at - train.span - SAFETY_M,
      train.at + lookahead(train.kind),
    )) {
      if (!this.free(key, train)) {
        limit = start - SAFETY_M;
        break;
      }
      wanted.add(key);
    }
    for (const key of train.held)
      if (!wanted.has(key) && this.owners.get(key) === train.id)
        this.owners.delete(key);
    for (const key of wanted) this.owners.set(key, train.id);
    train.held = wanted;
    return limit;
  }

  /**
   * The rear becomes the front, the vehicles turned around, on the journey
   * reversed: the train runs back, with a new number and new passengers.
   */
  private turnAround(train: Train, length: number): void {
    const steps = reversed(train.path.legs);
    const total = train.path.length;
    train.path = this.journey(steps, train.stopsAt);
    train.at = Math.max(length, total - (train.at - length));
    train.vehicles.reverse();
    for (const vehicle of train.vehicles) vehicle.reversed = !vehicle.reversed;
    train.number ^= 1;
    train.passengers = boarding(train);
    this.backdate(train);
  }

  /**
   * Places each vehicle behind the front of the train, heading along the
   * chord between its ends: it turns smoothly through the bends, the
   * vehicles following one another on the rails. The block, zoomed out,
   * covers the track the train holds.
   */
  private locate(train: Train, scale: number, centre: Position): void {
    const { path, at } = train;
    let behind = 0;
    for (const vehicle of train.vehicles) {
      const length = TRAIN_PARTS[vehicle.part].length * scale;
      const front = pointAt(path, at - behind);
      const rear = pointAt(path, at - behind - length);
      const heading = bearing(rear, front);
      vehicle.position = pointAt(path, at - behind - length / 2);
      vehicle.bearing = heading + (vehicle.reversed ? 180 : 0);
      const t = nearestAlong(rear, front, centre);
      vehicle.anchor = pointAt(path, at - behind - length * (1 - t));
      // Ahead of the middle, the image lies behind its anchor: down, unless the vehicle runs backwards.
      const ahead = ((t - 0.5) * length) / scale;
      vehicle.offset = vehicle.reversed ? -ahead : ahead;
      behind += length + COUPLING_PX * scale;
    }
    const heading = bearing(pointAt(path, at - train.span), pointAt(path, at));
    train.block.position = pointAt(path, at - train.span / 2);
    train.block.bearing = heading;
  }

  private readonly tick = (time: number) => {
    this.frame = requestAnimationFrame(this.tick);
    const elapsed = time - this.lastFrame;
    // Followed, the train moves at the rate of the screen: the camera keeps up with it without jerks.
    if (!this.following && elapsed < FRAME_MS) return;
    this.lastFrame = time;
    if (time - this.lastSpawn > SPAWN_EVERY_MS) {
      this.lastSpawn = time;
      this.railways.forEach((railway, line) => {
        if (this.count(line) < railway.target) this.spawn(line);
      });
    }
    // A long frame, after the browser throttled the page, does not teleport the trains.
    const seconds = (Math.min(elapsed, 100) / 1000) * trainSpeed();
    this.clock += seconds * 1000;
    const zoom = this.map.getZoom();
    const { lng, lat } = this.map.getCenter();
    // Zoomed out, the vehicles keep their length at the detail zoom: within the track the train holds.
    const scale =
      sizeAt(zoom) * metresPerPixelAt(Math.max(zoom, TRAINS_DETAIL_ZOOM), lat);
    const bounds = this.viewBounds();
    // Heard only with their vehicles shown.
    this.audible = zoom >= TRAINS_DETAIL_ZOOM;
    // The loudest train in view sets the rolling noise: as many trains, the same sound.
    let rolling = 0;
    for (const train of this.trains) {
      this.step(train, seconds, scale);
      this.locate(train, scale, [lng, lat]);
      // Zoomed in, a long train can cross the view with its middle off screen.
      train.seen =
        inside(train.block.position, bounds) ||
        train.vehicles.some((vehicle) => inside(vehicle.anchor, bounds));
      if (train.seen && this.audible)
        rolling = Math.max(rolling, train.speed / cruise(train.kind));
    }
    setTrainRolling(Math.sqrt(rolling / 4));
    this.draw();
    this.follow(Math.min(elapsed, 100) / 1000);
  };

  /** Moves `train` on by `seconds`: speeding up to cruise, braking softly to its stops, waiting for the track. */
  private step(train: Train, seconds: number, scale: number): void {
    const time = this.clock;
    if (train.phase !== "run") {
      this.reserve(train);
      if (
        train.kind !== "freight" &&
        !train.whistled &&
        train.dwellUntil - time < WHISTLE_BEFORE_MS
      ) {
        // The guard on the platform before the doors close.
        train.whistled = true;
        if (train.seen && this.audible && Math.random() < WHISTLE_CHANCE)
          guardWhistle();
      }
      if (time < train.dwellUntil) return;
      if (train.phase === "turn")
        this.turnAround(
          train,
          lengthPx(train.kind, train.vehicles.length - 2) * scale,
        );
      train.phase = "run";
      if (train.seen && this.audible) horn();
    }
    const { legs } = train.path;
    const blockedAt = this.reserve(train);
    const stopLeg = legs.find((leg, i) => i >= train.reached && leg.stop);
    const stopAt = stopLeg ? legEnd(stopLeg) : Infinity;
    const endAt = train.path.length;
    const limit = Math.min(blockedAt, stopAt, endAt);
    const remaining = limit - train.at;
    const { accel } = KINDS[train.kind];
    train.speed = Math.min(
      train.speed + accel * seconds,
      cruise(train.kind),
      Math.sqrt(2 * accel * Math.max(0, remaining)),
    );
    if (remaining > 1) train.speed = Math.max(train.speed, CREEP_M_S);
    const moved = Math.min(train.speed * seconds, Math.max(0, remaining));
    train.at += moved;
    const arrived = remaining - moved <= 0.5;
    // Stations reached, on the way or at the stop: when, for the itinerary.
    while (
      train.reached < legs.length &&
      legEnd(legs[train.reached]) <= train.at + 0.5
    )
      train.times[train.reached++] = Date.now();
    if (!arrived) {
      train.waitingSince = 0;
      return;
    }
    train.speed = 0;
    if (blockedAt < Math.min(stopAt, endAt)) {
      // Held up by another train: it goes back after a long while.
      train.waitingSince ||= time;
      if (time - train.waitingSince > WAIT_MS)
        this.halt(train, "turn", time + TURN_DWELL_MS);
      return;
    }
    if (stopAt < endAt) {
      // Some get off, others get on.
      train.passengers = boarding(train);
      this.halt(train, "stop", time + DWELL_MS);
    } else this.halt(train, "turn", time + TERMINUS_DWELL_MS);
  }

  private halt(train: Train, phase: Phase, until: number): void {
    train.phase = phase;
    train.dwellUntil = until;
    train.waitingSince = 0;
    train.whistled = false;
    if (train.seen) brake();
  }

  private viewBounds(): Bounds {
    const [[west, south], [east, north]] = this.map.getBounds().toArray();
    const dx = (east - west) * VIEW_MARGIN;
    const dy = (north - south) * VIEW_MARGIN;
    return [west - dx, south - dy, east + dx, north + dy];
  }

  /** Brings the train followed to the focus point, unless the user is moving the map. */
  private follow(seconds: number): void {
    if (!this.following || this.map.isMoving()) return;
    const train = this.trains.find((t) => t.id === this.selected);
    if (!train) return;
    const middle =
      this.map.getZoom() < TRAINS_DETAIL_ZOOM
        ? train.block.position
        : train.vehicles[train.vehicles.length >> 1].position;
    const target = this.map.project(middle as [number, number]);
    const focus = this.focusPoint();
    const dx = target.x - focus.x;
    const dy = target.y - focus.y;
    if (Math.hypot(dx, dy) < 0.05) return;
    const k = 1 - Math.exp(-seconds / FOLLOW_S);
    const { clientWidth, clientHeight } = this.map.getContainer();
    const center = this.map.unproject([
      clientWidth / 2 + dx * k,
      clientHeight / 2 + dy * k,
    ]);
    this.map.jumpTo({ center }, { [TRAIN_FOLLOW_EVENT]: true });
  }

  private readonly redraw = () => {
    this.empty = false;
    this.draw();
  };

  /** Draws the trains in view: blocks zoomed out, vehicles zoomed in. */
  private readonly draw = () => {
    const source = this.map.getSource<GeoJSONSource>(TRAINS_SOURCE);
    if (!source) return;
    const seen = this.trains.filter((t) => t.seen);
    if (seen.length === 0) {
      if (!this.empty) source.setData(EMPTY);
      this.empty = true;
      return;
    }
    this.empty = false;
    const blocks = this.map.getZoom() < TRAINS_DETAIL_ZOOM;
    const features: Feature<Point>[] = [];
    const add = (
      train: number,
      image: string,
      position: Position,
      heading: number,
      offset = 0,
    ) =>
      features.push({
        type: "Feature",
        properties: { train, image, bearing: heading, offset: [0, offset] },
        geometry: { type: "Point", coordinates: position },
      });
    for (const train of seen) {
      const suffix = train.id === this.selected ? SELECTED_SUFFIX : "";
      if (blocks) {
        add(
          train.id,
          TRAIN_BLOCKS[KINDS[train.kind].cab].image + suffix,
          train.block.position,
          train.block.bearing,
        );
        continue;
      }
      for (const vehicle of train.vehicles)
        add(
          train.id,
          TRAIN_PARTS[vehicle.part].image + suffix,
          vehicle.anchor,
          vehicle.bearing,
          vehicle.offset,
        );
    }
    source.setData({ type: "FeatureCollection", features });
  };
}

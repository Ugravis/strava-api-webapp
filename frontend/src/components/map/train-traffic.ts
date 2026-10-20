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
import { FADE_ZOOMS } from "./map-style";
import {
  SELECTED_SUFFIX,
  TRAIN_BLOCK,
  TRAIN_PARTS,
  type TrainPart,
} from "./station-icons";
import type { LinkEnd, LinkProperties } from "./stations-layer";

/** Source of the trains, drawn by the stations layer. */
export const TRAINS_SOURCE = "station-trains";
/** Zoom from which the trains fade in, as plain blocks. */
export const TRAINS_MIN_ZOOM = 9;
/** Zoom from which each train shows its vehicles, cross-fading from its block over half a level. */
export const TRAINS_DETAIL_ZOOM = 13;
const DETAIL_BLEND_ZOOMS = 0.5;
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

/**
 * A size by zoom from `stops` (increasing zooms), up to the real scale, then
 * doubling with each zoom level as the ground does.
 */
export function realScale(
  stops: [zoom: number, value: number][],
): ExpressionSpecification {
  const below = stops.filter(([zoom]) => zoom < REAL_SCALE_ZOOM);
  const [z0, v0] = below[below.length - 1];
  const next = stops.find(([zoom]) => zoom >= REAL_SCALE_ZOOM);
  const atScale = next
    ? v0 + ((next[1] - v0) * (REAL_SCALE_ZOOM - z0)) / (next[0] - z0)
    : v0;
  const atMax = atScale * 2 ** (MAX_SCALE_ZOOM - REAL_SCALE_ZOOM);
  return [
    "interpolate",
    ["exponential", 2],
    ["zoom"],
    ...below.flat(),
    REAL_SCALE_ZOOM,
    atScale,
    MAX_SCALE_ZOOM,
    atMax,
  ] as ExpressionSpecification;
}

/** Size of the images of the trains. */
export const TRAIN_SIZE = realScale([[0, MIN_TRAIN_SIZE]]);

/** Opacity of the trains: fading in zoomed out, the blocks giving way to the vehicles zoomed in. */
export const TRAIN_OPACITY: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  TRAINS_MIN_ZOOM,
  0,
  TRAINS_MIN_ZOOM + FADE_ZOOMS,
  ["case", ["get", "block"], ["get", "opacity"], 0],
  TRAINS_DETAIL_ZOOM - DETAIL_BLEND_ZOOMS,
  ["case", ["get", "block"], ["get", "opacity"], 0],
  TRAINS_DETAIL_ZOOM,
  ["case", ["get", "block"], 0, ["get", "opacity"]],
];

/** Size of the trains at `zoom`, as drawn by `TRAIN_SIZE`. */
function sizeAt(zoom: number): number {
  return MIN_TRAIN_SIZE * 2 ** Math.max(0, zoom - REAL_SCALE_ZOOM);
}

/** At most this many trains on the whole network, seen or not. */
const MAX_TRAINS = 40;
/** One train for each such length of unlocked railway, in metres. */
const NETWORK_M_PER_TRAIN = 20_000;
/** About 30 frames a second: smooth enough for a train, half the work of the screen rate. */
const FRAME_MS = 1000 / 30;
/** Room kept free before and behind each train, in metres: two trains never touch. */
const SAFETY_M = 300;
/** Slowest speed while closing on a stop, in metres a second: a train always ends up there. */
const CREEP_M_S = 2;
/** Stop at a station, in milliseconds. */
const DWELL_MS = 5000;
/** Stop before going back from a track taken, in milliseconds. */
const TURN_DWELL_MS = 2500;
/** Wait for a track taken by another train before going back, in milliseconds. */
const WAIT_MS = 6000;
/** How long before leaving the guard may blow the whistle, in milliseconds, and how often. */
const WHISTLE_BEFORE_MS = 1800;
const WHISTLE_CHANCE = 0.5;
/** How often a missing train is put on the network, in milliseconds. */
const SPAWN_EVERY_MS = 1000;
/** Fade in of a new train, in milliseconds. */
const FADE_MS = 800;
/** Gap between two vehicles, in CSS pixels before the size of the trains. */
const COUPLING_PX = 1.2;
/** Time constant of the camera catching up with the train it follows, in seconds. */
const FOLLOW_S = 0.35;
/** Part of the view added around it where trains are still drawn: they enter it already there. */
const VIEW_MARGIN = 0.2;

interface KindSpec {
  weight: number;
  kmh: number;
  /** Acceleration and braking, in metres a second squared. */
  accel: number;
  /** Chance of stopping at a station on the way. */
  stopChance: number;
  part: TrainPart;
  /** Vehicles between the two driving ones, at least and at most. */
  cars: readonly [number, number];
  seatsPerCar: number;
  number: readonly [number, number];
}

/** Kinds of trains, picked at random with their weight. */
const KINDS = {
  ter: {
    weight: 5,
    kmh: 140,
    accel: 1.1,
    stopChance: 1,
    part: "car",
    cars: [1, 3],
    seatsPerCar: 70,
    number: [800_000, 899_999],
  },
  intercites: {
    weight: 1.5,
    kmh: 180,
    accel: 0.9,
    stopChance: 0.5,
    part: "car",
    cars: [2, 6],
    seatsPerCar: 80,
    number: [3_000, 4_999],
  },
  tgv: {
    weight: 2,
    kmh: 300,
    accel: 0.8,
    stopChance: 0.3,
    part: "car",
    cars: [3, 8],
    seatsPerCar: 60,
    number: [6_000, 9_999],
  },
  freight: {
    weight: 1.5,
    kmh: 100,
    accel: 0.4,
    stopChance: 0,
    part: "wagon",
    cars: [2, 10],
    seatsPerCar: 0,
    number: [40_000, 69_999],
  },
} as const satisfies Record<string, KindSpec>;
export type TrainKind = keyof typeof KINDS;

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
}

/** A link on the path of a train, in its direction of travel. */
interface Leg {
  edge: Edge;
  forward: boolean;
  /** Distance along the path where the leg starts, in metres. */
  from: number;
  /** Whether the train stops at the station ending the leg. */
  stop: boolean;
}

/** The track ahead and just behind a train, legs joined end to end. */
interface Path {
  legs: Leg[];
  coords: Position[];
  along: number[];
  length: number;
  /** Whether the path ends at a dead end, where the train goes back. */
  terminus: boolean;
}

/** A vehicle of a train; `reversed` when it runs backwards, as the driving vehicle at the rear. */
interface Vehicle {
  part: TrainPart;
  reversed: boolean;
  position: Position;
  bearing: number;
}

type Phase = "run" | "stop" | "turn";

interface Train {
  id: number;
  kind: TrainKind;
  number: number;
  path: Path;
  /** Distance of the front of the train along its path, in metres. */
  at: number;
  /** Track the train keeps for itself, in metres: its longest drawn length, at the detail zoom. */
  span: number;
  /** Speed, in metres a second: the same whatever the zoom. */
  speed: number;
  phase: Phase;
  /** End of the stop, in milliseconds of `performance.now()`. */
  dwellUntil: number;
  /** The leg whose station the train stops at. */
  stopLeg: Leg | null;
  whistled: boolean;
  /** Since when the train waits for a track taken, in milliseconds; 0 while it does not. */
  waitingSince: number;
  bornAt: number;
  /** From the front to the rear. */
  vehicles: Vehicle[];
  /** Where the block of the train is drawn zoomed out, and its heading. */
  block: { position: Position; bearing: number };
  /** Tracks and stations the train holds, by key. */
  held: Set<string>;
  passengers: number;
  cargo: Cargo | null;
  tonnes: number;
  delayMin: number;
  /** Whether the train is in view. */
  seen: boolean;
}

/** What the panel tells of a train. */
export interface TrainInfo {
  id: number;
  kind: TrainKind;
  number: number;
  /** The station the train comes from and the next one. */
  from: LinkEnd;
  to: LinkEnd;
  vehicles: number;
  /** Null for a freight train. */
  passengers: number | null;
  seats: number | null;
  /** Null for a passenger train. */
  cargo: Cargo | null;
  tonnes: number | null;
  speedKmh: number;
  /** Distance left to the next station, in metres. */
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
const edgeKey = (edge: Edge) => `e${edge.index}`;
const nodeKey = (station: LinkEnd) => `n${station.id}`;
const startOf = (leg: Leg) => (leg.forward ? leg.edge.start : leg.edge.end);
const endOf = (leg: Leg) => (leg.forward ? leg.edge.end : leg.edge.start);
const legEnd = (leg: Leg) => leg.from + leg.edge.length;

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
  return {
    index: 0,
    coords,
    along,
    length: along[along.length - 1],
    start: properties.start,
    end: properties.end,
    line: 0,
  };
}

/** Joins `legs` end to end, setting where each starts. */
function buildPath(legs: Leg[], terminus = false): Path {
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
  return { legs, coords, along, length: along[along.length - 1], terminus };
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

function inside([lon, lat]: Position, bounds: Bounds): boolean {
  return (
    lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
  );
}

function pickKind(): TrainKind {
  const kinds = Object.keys(KINDS) as TrainKind[];
  let left =
    Math.random() * kinds.reduce((sum, kind) => sum + KINDS[kind].weight, 0);
  for (const kind of kinds) {
    left -= KINDS[kind].weight;
    if (left < 0) return kind;
  }
  return "ter";
}

/** Length of a train of `kind` with `cars` between its driving vehicles, in CSS pixels before the size of the trains. */
function lengthPx(kind: TrainKind, cars: number): number {
  return (
    2 * TRAIN_PARTS.loco.length +
    cars * TRAIN_PARTS[KINDS[kind].part].length +
    (cars + 1) * COUPLING_PX
  );
}

/** A driving vehicle at each end, the rear one backwards, and `cars` between. */
function consist(kind: TrainKind, cars: number): Vehicle[] {
  const vehicle = (part: TrainPart, reversed = false): Vehicle => ({
    part,
    reversed,
    position: [0, 0],
    bearing: 0,
  });
  return [
    vehicle("loco"),
    ...Array.from({ length: cars }, () => vehicle(KINDS[kind].part)),
    vehicle("loco", true),
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

/**
 * Trains running over the whole unlocked railway, from link to link through
 * the stations, whether in view or not: the user looks for them. Each holds
 * the tracks and stations it covers and needs to stop, so trains never
 * overlap; one waiting too long for a track goes back. The animation runs
 * with the stations shown, zoomed in enough and the tab visible, even while
 * the map moves. A train picked can be followed by the camera.
 */
export class TrainTraffic {
  private edges: Edge[] = [];
  /** The links at each station, by station id. */
  private nodes = new Map<number, Edge[]>();
  private trains: Train[] = [];
  /** Train holding each track and station, by key. */
  private owners = new Map<string, number>();
  private target = 0;
  private visible: boolean;
  private frame = 0;
  private lastFrame = 0;
  private lastSpawn = 0;
  private nextId = 1;
  /** Whether the source is known empty: no data sent again while no train is seen. */
  private empty = false;
  private selected: number | null = null;
  private following = false;

  constructor(
    private readonly map: MapLibreMap,
    visible: boolean,
    /** Where on the map container the train followed should be, in pixels: beside the panel. */
    private readonly focusPoint: () => { x: number; y: number },
  ) {
    this.visible = visible;
    map.on("moveend", this.onMoveEnd);
    // Dragged by the user, the map stops following the train.
    map.on("dragstart", this.stopFollowing);
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
    this.labelLines();
    this.trains = [];
    this.owners.clear();
    const total = this.edges.reduce((sum, e) => sum + e.length, 0);
    this.target = Math.min(MAX_TRAINS, Math.round(total / NETWORK_M_PER_TRAIN));
    const now = performance.now();
    for (
      let attempt = 0;
      attempt < this.target * 3 && this.trains.length < this.target;
      attempt++
    )
      this.spawn(now);
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
    const leg = this.legAt(train);
    const isFreight = train.kind === "freight";
    return {
      id,
      kind: train.kind,
      number: train.number,
      from: startOf(leg),
      to: endOf(leg),
      vehicles: train.vehicles.length,
      passengers: isFreight ? null : train.passengers,
      seats: isFreight ? null : seats(train),
      cargo: train.cargo,
      tonnes: isFreight ? train.tonnes : null,
      speedKmh: Math.round(train.speed * 3.6),
      remainingM: Math.max(0, legEnd(leg) - train.at),
      onLine: this.trains.filter(
        (t) => this.legAt(t).edge.line === leg.edge.line,
      ).length,
      delayMin: train.delayMin,
      dwelling: train.phase !== "run",
      following: this.following && this.selected === id,
    };
  }

  destroy(): void {
    this.pause();
    this.map.off("moveend", this.onMoveEnd);
    this.map.off("dragstart", this.stopFollowing);
    this.map.off("style.load", this.redraw);
    document.removeEventListener("visibilitychange", this.run);
  }

  /** Numbers the railways: links joined through their stations share one. */
  private labelLines(): void {
    const done = new Set<number>();
    let line = 0;
    for (const first of this.edges) {
      if (done.has(first.index)) continue;
      const queue = [first];
      done.add(first.index);
      while (queue.length > 0) {
        const e = queue.pop()!;
        e.line = line;
        for (const station of [e.start, e.end]) {
          for (const next of this.nodes.get(station.id) ?? []) {
            if (done.has(next.index)) continue;
            done.add(next.index);
            queue.push(next);
          }
        }
      }
      line++;
    }
  }

  /** The leg the front of `train` runs on: at a station, the one it arrived by. */
  private legAt(train: Train): Leg {
    const { legs } = train.path;
    for (let i = legs.length - 1; i > 0; i--)
      if (legs[i].from < train.at) return legs[i];
    return legs[0];
  }

  private free(key: string, train: Train | null): boolean {
    const owner = this.owners.get(key);
    return owner === undefined || owner === train?.id;
  }

  /**
   * Puts a train of a random kind on a free link long enough for it, at a
   * random point, heading either way, with as many cars as fit.
   */
  private spawn(now: number): void {
    const kind = pickKind();
    const { part, cars } = KINDS[kind];
    const metresPerPx = (e: Edge) =>
      MIN_TRAIN_SIZE * metresPerPixelAt(TRAINS_DETAIL_ZOOM, e.coords[0][1]);
    const room = (e: Edge) => e.length - 2 * SAFETY_M;
    const candidates = this.edges.filter(
      (e) =>
        this.free(edgeKey(e), null) &&
        this.free(nodeKey(e.start), null) &&
        this.free(nodeKey(e.end), null) &&
        lengthPx(kind, 1) * metresPerPx(e) <= room(e),
    );
    if (candidates.length === 0) return;
    let left = Math.random() * candidates.reduce((sum, e) => sum + e.length, 0);
    const chosen =
      candidates.find((e) => (left -= e.length) < 0) ??
      candidates[candidates.length - 1];
    const scale = metresPerPx(chosen);
    const fitting = Math.floor(
      (room(chosen) / scale - 2 * TRAIN_PARTS.loco.length - COUPLING_PX) /
        (TRAIN_PARTS[part].length + COUPLING_PX),
    );
    const count = Math.max(1, Math.min(randomInt(cars[0], cars[1]), fitting));
    const span = lengthPx(kind, count) * scale;
    const path = buildPath([
      { edge: chosen, forward: Math.random() < 0.5, from: 0, stop: false },
    ]);
    const isFreight = kind === "freight";
    const train: Train = {
      id: this.nextId++,
      kind,
      number: randomInt(KINDS[kind].number[0], KINDS[kind].number[1]),
      path,
      // Anywhere on the link, the whole train on it.
      at: random(SAFETY_M + span, path.length - SAFETY_M),
      span,
      speed: cruise(kind) * random(0.5, 1),
      phase: "run",
      dwellUntil: 0,
      stopLeg: null,
      whistled: false,
      waitingSince: 0,
      bornAt: now,
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
    this.trains.push(train);
    this.extend(train);
    this.reserve(train);
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

  /** Adds links ahead of `train` to see as far as it needs to stop, through the stations, until a dead end. */
  private extend(train: Train): void {
    const need = train.at + lookahead(train.kind);
    if (train.path.terminus || train.path.length >= need) return;
    const legs = [...train.path.legs];
    let length = train.path.length;
    let terminus = false;
    while (length < need) {
      const last = legs[legs.length - 1];
      const station = endOf(last);
      const options = (this.nodes.get(station.id) ?? []).filter(
        (e) => e !== last.edge,
      );
      if (options.length === 0) {
        terminus = true;
        break;
      }
      // A free track first: the train goes round the others.
      const free = options.filter((e) => this.free(edgeKey(e), train));
      const next = pick(free.length > 0 ? free : options);
      last.stop = Math.random() < KINDS[train.kind].stopChance;
      legs.push({
        edge: next,
        forward: next.start.id === station.id,
        from: 0,
        stop: false,
      });
      length += next.length;
    }
    train.path = buildPath(legs, terminus);
  }

  /** Drops the links left behind `train`: the path stays short. */
  private trim(train: Train): void {
    const { legs, terminus } = train.path;
    let first = 0;
    while (
      first < legs.length - 1 &&
      legEnd(legs[first]) < train.at - train.span - SAFETY_M
    )
      first++;
    if (first === 0) return;
    const offset = legs[first].from;
    train.path = buildPath(legs.slice(first), terminus);
    train.at -= offset;
  }

  /**
   * Holds the stations and tracks from behind `train` to as far as it needs
   * to stop ahead, releasing those left behind. A station is taken with the
   * track after it. Returns how far the train may go: before the first one
   * held by another train.
   */
  private reserve(train: Train): number {
    const { path } = train;
    const low = train.at - train.span - SAFETY_M;
    const high = train.at + lookahead(train.kind);
    const wanted = new Set<string>();
    let limit = Infinity;
    for (const leg of path.legs) {
      if (legEnd(leg) < low) continue;
      if (leg.from > high) break;
      const keys =
        leg.from >= low
          ? [nodeKey(startOf(leg)), edgeKey(leg.edge)]
          : [edgeKey(leg.edge)];
      if (!keys.every((key) => this.free(key, train))) {
        limit = leg.from - SAFETY_M;
        break;
      }
      for (const key of keys) wanted.add(key);
    }
    const terminal = nodeKey(endOf(path.legs[path.legs.length - 1]));
    if (limit === Infinity && path.terminus && path.length <= high) {
      if (this.free(terminal, train)) wanted.add(terminal);
      else limit = path.length - SAFETY_M;
    }
    for (const key of train.held)
      if (!wanted.has(key) && this.owners.get(key) === train.id)
        this.owners.delete(key);
    for (const key of wanted) this.owners.set(key, train.id);
    train.held = wanted;
    return limit;
  }

  /** The rear becomes the front, the vehicles turned around, on the path reversed. */
  private turnAround(train: Train, length: number): void {
    const legs = [...train.path.legs].reverse();
    for (const leg of legs) {
      leg.forward = !leg.forward;
      leg.stop = false;
    }
    const total = train.path.length;
    train.path = buildPath(legs);
    train.at = total - (train.at - length);
    train.vehicles.reverse();
    for (const vehicle of train.vehicles) vehicle.reversed = !vehicle.reversed;
  }

  /**
   * Places each vehicle behind the front of the train, heading along the
   * chord between its ends: it turns smoothly through the bends, the
   * vehicles following one another on the rails. The block, zoomed out,
   * covers the track the train holds.
   */
  private locate(train: Train, scale: number): void {
    const { path, at } = train;
    let offset = 0;
    for (const vehicle of train.vehicles) {
      const length = TRAIN_PARTS[vehicle.part].length * scale;
      const front = pointAt(path, at - offset);
      const rear = pointAt(path, at - offset - length);
      vehicle.position = pointAt(path, at - offset - length / 2);
      vehicle.bearing = bearing(rear, front) + (vehicle.reversed ? 180 : 0);
      offset += length + COUPLING_PX * scale;
    }
    train.block.position = pointAt(path, at - train.span / 2);
    train.block.bearing = bearing(
      pointAt(path, at - train.span),
      pointAt(path, at),
    );
  }

  private readonly tick = (time: number) => {
    this.frame = requestAnimationFrame(this.tick);
    const elapsed = time - this.lastFrame;
    // Followed, the train moves at the rate of the screen: the camera keeps up with it without jerks.
    if (!this.following && elapsed < FRAME_MS) return;
    this.lastFrame = time;
    if (
      this.trains.length < this.target &&
      time - this.lastSpawn > SPAWN_EVERY_MS
    ) {
      this.lastSpawn = time;
      this.spawn(time);
    }
    // A long frame, after the browser throttled the page, does not teleport the trains.
    const seconds = Math.min(elapsed, 100) / 1000;
    const zoom = this.map.getZoom();
    // Zoomed out, the vehicles keep their length at the detail zoom: within the track the train holds.
    const scale =
      sizeAt(zoom) *
      metresPerPixelAt(
        Math.max(zoom, TRAINS_DETAIL_ZOOM),
        this.map.getCenter().lat,
      );
    const bounds = this.viewBounds();
    let rolling = 0;
    for (const train of this.trains) {
      this.step(train, time, seconds, scale);
      this.locate(train, scale);
      train.seen = inside(train.block.position, bounds);
      if (train.seen) rolling += train.speed / cruise(train.kind);
    }
    setTrainRolling(Math.sqrt(Math.min(1, rolling / 4)));
    this.draw();
    this.follow(seconds);
  };

  /** Moves `train` on by `seconds`: speeding up to cruise, braking softly to its stops, waiting for the track. */
  private step(
    train: Train,
    time: number,
    seconds: number,
    scale: number,
  ): void {
    if (train.phase !== "run") {
      this.reserve(train);
      if (
        train.kind !== "freight" &&
        !train.whistled &&
        train.dwellUntil - time < WHISTLE_BEFORE_MS
      ) {
        // The guard on the platform before the doors close.
        train.whistled = true;
        if (train.seen && Math.random() < WHISTLE_CHANCE) guardWhistle();
      }
      if (time < train.dwellUntil) return;
      if (train.phase === "turn")
        this.turnAround(
          train,
          lengthPx(train.kind, train.vehicles.length - 2) * scale,
        );
      if (train.stopLeg) train.stopLeg.stop = false;
      train.stopLeg = null;
      train.phase = "run";
      if (train.seen) horn();
    }
    this.extend(train);
    this.trim(train);
    const blockedAt = this.reserve(train);
    const stopLeg =
      train.path.legs.find(
        (leg) => leg.stop && legEnd(leg) >= train.at - 0.5,
      ) ?? null;
    const stopAt = stopLeg ? legEnd(stopLeg) : Infinity;
    const endAt = train.path.terminus ? train.path.length : Infinity;
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
    if (remaining - moved > 0.5) {
      train.waitingSince = 0;
      return;
    }
    train.speed = 0;
    if (blockedAt < Math.min(stopAt, endAt)) {
      // Held up by another train: it goes back after a while.
      train.waitingSince ||= time;
      if (time - train.waitingSince > WAIT_MS)
        this.halt(train, "turn", time + TURN_DWELL_MS, null);
      return;
    }
    // Some get off, others get on.
    train.passengers = boarding(train);
    if (stopAt <= endAt) this.halt(train, "stop", time + DWELL_MS, stopLeg);
    else this.halt(train, "turn", time + DWELL_MS, null);
  }

  private halt(
    train: Train,
    phase: Phase,
    until: number,
    stopLeg: Leg | null,
  ): void {
    train.phase = phase;
    train.dwellUntil = until;
    train.stopLeg = stopLeg;
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

  /** Draws the trains in view: blocks zoomed out, vehicles zoomed in, both while they cross-fade. */
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
    const zoom = this.map.getZoom();
    const blocks = zoom < TRAINS_DETAIL_ZOOM;
    const vehicles = zoom >= TRAINS_DETAIL_ZOOM - DETAIL_BLEND_ZOOMS;
    const now = performance.now();
    const features: Feature<Point>[] = [];
    const add = (
      train: number,
      image: string,
      position: Position,
      heading: number,
      block: boolean,
      opacity: number,
    ) =>
      features.push({
        type: "Feature",
        properties: { train, image, bearing: heading, block, opacity },
        geometry: { type: "Point", coordinates: position },
      });
    for (const train of seen) {
      const opacity = Math.min(1, (now - train.bornAt) / FADE_MS);
      const suffix = train.id === this.selected ? SELECTED_SUFFIX : "";
      if (blocks)
        add(
          train.id,
          TRAIN_BLOCK.image + suffix,
          train.block.position,
          train.block.bearing,
          true,
          opacity,
        );
      if (!vehicles) continue;
      for (const vehicle of train.vehicles) {
        add(
          train.id,
          TRAIN_PARTS[vehicle.part].image + suffix,
          vehicle.position,
          vehicle.bearing,
          false,
          opacity,
        );
      }
    }
    source.setData({ type: "FeatureCollection", features });
  };
}

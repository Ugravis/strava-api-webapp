import type { Feature, FeatureCollection, LineString, Point, Position } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { brake, setTrainRolling, whistle } from "@/lib/sound/train-sound";
import { SELECTED_SUFFIX, TRAIN_PARTS, type TrainPart } from "./station-icons";
import type { LinkEnd, LinkProperties } from "./stations-layer";

/** Source of the trains, drawn by the stations layer. */
export const TRAINS_SOURCE = "station-trains";
/** Zoom from which the trains fade in, with the station icons. */
export const TRAINS_MIN_ZOOM = 11;
/** Marks the moves of the camera following a train: the handlers of the user's moves ignore them. */
export const TRAIN_FOLLOW_EVENT = "trainFollow";

/** Size of the trains: constant zoomed out, so they never shrink to specks, growing zoomed in. */
const SIZE_STOPS = [
  [14, 1.1],
  [17, 1.6],
] as const;
export const TRAIN_SIZE: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], ...SIZE_STOPS.flat()];

/** At most this many trains on the map, all lines together: dense cities stay light. */
const MAX_TRAINS = 12;
/** At most this many trains on one link, the longest ones. */
const MAX_TRAINS_PER_ROUTE = 3;
/** One more train allowed on a link for each such length, in metres. */
const ROUTE_M_PER_TRAIN = 15_000;
/** About 30 frames a second: smooth enough for a train, half the work of the screen rate. */
const FRAME_MS = 1000 / 30;
/** Cruising speed on the screen, in pixels a second, whatever the zoom: a train is always seen moving. */
const SPEED_PX_S = 40;
/** Acceleration and braking, in pixels a second squared: a train leaves and enters a station softly. */
const ACCEL_PX_S2 = 14;
/** Slowest speed while braking, in pixels a second: a train always ends up in the station. */
const CREEP_PX_S = 3;
/** Stop at each station, in milliseconds, before leaving the other way. */
const DWELL_MS = 3000;
/** Fade in of a new train, in milliseconds. */
const FADE_MS = 800;
/** Gap between two vehicles, in CSS pixels before the size of the trains. */
const COUPLING_PX = 1.2;
/** Links shorter than this, in metres, carry no train: it would only turn around. */
const MIN_ROUTE_M = 300;
/** Time constant of the camera catching up with the train it follows, in seconds. */
const FOLLOW_S = 0.35;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const METRES_PER_DEGREE = 111_320;

/** Kinds of trains, picked at random with their weight. */
const KINDS = {
  ter: { weight: 5, speed: 1, kmh: 160, seatsPerCar: 70, number: [800_000, 899_999] },
  intercites: { weight: 1.5, speed: 1.15, kmh: 200, seatsPerCar: 80, number: [3_000, 4_999] },
  tgv: { weight: 2, speed: 1.4, kmh: 300, seatsPerCar: 60, number: [6_000, 9_999] },
  freight: { weight: 1.5, speed: 0.75, kmh: 100, seatsPerCar: 0, number: [40_000, 69_999] },
} as const;
export type TrainKind = keyof typeof KINDS;

type Bounds = [west: number, south: number, east: number, north: number];

/** A link unlocked, measured once: where a train is along it follows from its distance. */
interface Route {
  coords: Position[];
  /** Distance from the start to each point, in metres. */
  along: number[];
  length: number;
  bounds: Bounds;
  start: LinkEnd;
  end: LinkEnd;
}

/** A vehicle of a train; `reversed` when it runs backwards, as the locomotive at the rear. */
interface Vehicle {
  part: TrainPart;
  reversed: boolean;
  position: Position;
  bearing: number;
}

interface Train {
  id: number;
  kind: TrainKind;
  number: number;
  route: Route;
  /** Distance of the front of the train from the start of the route, in metres. */
  at: number;
  direction: 1 | -1;
  /** Speed on the screen, in pixels a second. */
  speed: number;
  /** End of the stop at a station, in milliseconds of `performance.now()`; 0 while running. */
  dwellUntil: number;
  bornAt: number;
  /** From the front to the rear. */
  vehicles: Vehicle[];
  passengers: number;
  delayMin: number;
}

/** What the panel tells of a train. */
export interface TrainInfo {
  id: number;
  kind: TrainKind;
  number: number;
  /** The station the train comes from and the one it runs to. */
  from: LinkEnd;
  to: LinkEnd;
  vehicles: number;
  /** Null for a freight train. */
  passengers: number | null;
  seats: number | null;
  speedKmh: number;
  /** Distance left to the next station, in metres. */
  remainingM: number;
  /** Trains on the same link, this one included. */
  onLink: number;
  delayMin: number;
  dwelling: boolean;
  following: boolean;
}

const EMPTY: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

const random = (min: number, max: number) => min + Math.random() * (max - min);
const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));

function metres(a: Position, b: Position): number {
  const dx = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dx, b[1] - a[1]) * METRES_PER_DEGREE;
}

function route({ geometry, properties }: Feature<LineString, LinkProperties>): Route | null {
  const coords = geometry.coordinates;
  if (coords.length < 2) return null;
  const along = [0];
  const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < coords.length; i++) {
    const [lon, lat] = coords[i];
    if (i > 0) along.push(along[i - 1] + metres(coords[i - 1], coords[i]));
    bounds[0] = Math.min(bounds[0], lon);
    bounds[1] = Math.min(bounds[1], lat);
    bounds[2] = Math.max(bounds[2], lon);
    bounds[3] = Math.max(bounds[3], lat);
  }
  const length = along[along.length - 1];
  return length >= MIN_ROUTE_M ? { coords, along, length, bounds, start: properties.start, end: properties.end } : null;
}

/** The point `at` metres along `route`, clamped to its ends. */
function pointAt({ coords, along, length }: Route, at: number): Position {
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

function overlaps(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function inside([lon, lat]: Position, bounds: Bounds): boolean {
  return lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3];
}

/** A distance along `route` at one of its points in view: a long link mostly out of view still shows its train. */
function startIn({ coords, along, length }: Route, bounds: Bounds): number {
  const inView: number[] = [];
  coords.forEach((point, i) => {
    if (inside(point, bounds)) inView.push(along[i]);
  });
  return inView.length > 0 ? inView[Math.floor(Math.random() * inView.length)] : Math.random() * length;
}

function pickKind(): TrainKind {
  const kinds = Object.keys(KINDS) as TrainKind[];
  let left = Math.random() * kinds.reduce((sum, kind) => sum + KINDS[kind].weight, 0);
  for (const kind of kinds) {
    left -= KINDS[kind].weight;
    if (left < 0) return kind;
  }
  return "ter";
}

/** The vehicles of a train of `kind`, from the front: their number is random. */
function consist(kind: TrainKind): Vehicle[] {
  const vehicle = (part: TrainPart, reversed = false): Vehicle => ({ part, reversed, position: [0, 0], bearing: 0 });
  const cars = (count: number, part: TrainPart = "car") => Array.from({ length: count }, () => vehicle(part));
  switch (kind) {
    case "ter":
      return [vehicle("loco"), ...cars(randomInt(0, 2)), vehicle("loco", true)];
    case "intercites":
      return [vehicle("loco"), ...cars(randomInt(4, 6))];
    case "tgv":
      return [vehicle("loco"), ...cars(randomInt(4, 6)), vehicle("loco", true)];
    case "freight":
      return [vehicle("loco"), ...cars(randomInt(5, 8), "wagon")];
  }
}

function seats({ kind, vehicles }: Train): number {
  return vehicles.filter((v) => v.part === "car").length * KINDS[kind].seatsPerCar;
}

/** Passengers aboard, from a few to slightly overbooked. */
function boarding(train: Train): number {
  return Math.round(seats(train) * random(0.15, 1.05));
}

/** Size of the trains at `zoom`, as drawn by `TRAIN_SIZE`. */
function sizeAt(zoom: number): number {
  const [[z0, s0], [z1, s1]] = SIZE_STOPS;
  const t = Math.min(Math.max((zoom - z0) / (z1 - z0), 0), 1);
  return s0 + (s1 - s0) * t;
}

/**
 * Trains moving back and forth along the unlocked links in view, with their
 * sound. The animation runs zoomed in, with the stations shown and the tab
 * visible, even while the map moves; the trains are picked again once it
 * stops. A train picked can be followed by the camera.
 */
export class TrainTraffic {
  private routes: Route[] = [];
  private trains: Train[] = [];
  private visible: boolean;
  private frame = 0;
  private lastFrame = 0;
  private nextId = 1;
  /** Whether the source is known empty: no data sent again while no train runs. */
  private empty = false;
  /** The map in view, updated with every frame. */
  private bounds: Bounds = [0, 0, 0, 0];
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
    document.addEventListener("visibilitychange", this.dispatch);
  }

  /** Runs trains on `links`, replacing those of the previous links. */
  setLinks(links: FeatureCollection<LineString, LinkProperties>): void {
    this.routes = links.features.map(route).filter((r) => r !== null);
    this.trains = [];
    this.dispatch();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.dispatch();
  }

  /** Marks the train shown in the panel, followed by the camera; null for none. */
  select(id: number | null): void {
    this.selected = id;
    this.following = id !== null;
    this.draw();
  }

  setFollowing(following: boolean): void {
    this.following = following && this.selected !== null;
  }

  info(id: number): TrainInfo | null {
    const train = this.trains.find((t) => t.id === id);
    if (!train) return null;
    const { route, direction, kind } = train;
    const dwelling = train.dwellUntil > 0;
    const seatCount = seats(train);
    // While stopped, the train has already turned around: it still comes from the station ahead.
    const ahead = direction === 1 ? route.end : route.start;
    const behind = direction === 1 ? route.start : route.end;
    const cruise = SPEED_PX_S * KINDS[kind].speed;
    return {
      id,
      kind,
      number: train.number,
      from: dwelling ? ahead : behind,
      to: dwelling ? behind : ahead,
      vehicles: train.vehicles.length,
      passengers: seatCount > 0 ? train.passengers : null,
      seats: seatCount > 0 ? seatCount : null,
      speedKmh: Math.round((KINDS[kind].kmh * train.speed) / cruise),
      remainingM: dwelling ? 0 : direction === 1 ? route.length - train.at : train.at,
      onLink: this.trains.filter((t) => t.route === route).length,
      delayMin: train.delayMin,
      dwelling,
      following: this.following && this.selected === id,
    };
  }

  destroy(): void {
    this.pause();
    this.map.off("moveend", this.onMoveEnd);
    this.map.off("dragstart", this.stopFollowing);
    this.map.off("style.load", this.redraw);
    document.removeEventListener("visibilitychange", this.dispatch);
  }

  private active(): boolean {
    return this.visible && this.map.getZoom() >= TRAINS_MIN_ZOOM;
  }

  private readonly onMoveEnd = (event: object) => {
    if (!(TRAIN_FOLLOW_EVENT in event)) this.dispatch();
  };

  private readonly stopFollowing = () => {
    this.following = false;
  };

  /** Keeps the trains still in view, fills up to the cap from the links in view, and runs them. */
  private readonly dispatch = () => {
    if (!this.active()) {
      this.trains = [];
      this.pause();
      this.draw();
      return;
    }
    const bounds = this.map.getBounds().toArray().flat() as Bounds;
    this.bounds = bounds;
    this.trains = this.trains.filter((train) => train.id === this.selected || overlaps(train.route.bounds, bounds));
    const counts = new Map<Route, number>();
    for (const train of this.trains) counts.set(train.route, (counts.get(train.route) ?? 0) + 1);
    const room = (r: Route) => Math.min(MAX_TRAINS_PER_ROUTE, 1 + Math.floor(r.length / ROUTE_M_PER_TRAIN)) - (counts.get(r) ?? 0);
    const free = this.routes.filter((r) => overlaps(r.bounds, bounds) && room(r) > 0);
    const now = performance.now();
    const metresPerPixel = this.metresPerPixel();
    while (this.trains.length < MAX_TRAINS && free.length > 0) {
      const index = Math.floor(Math.random() * free.length);
      const picked = free[index];
      counts.set(picked, (counts.get(picked) ?? 0) + 1);
      if (room(picked) <= 0) free.splice(index, 1);
      const kind = pickKind();
      const train: Train = {
        id: this.nextId++,
        kind,
        number: randomInt(KINDS[kind].number[0], KINDS[kind].number[1]),
        route: picked,
        at: 0,
        direction: 1,
        speed: SPEED_PX_S * KINDS[kind].speed,
        dwellUntil: 0,
        bornAt: now,
        vehicles: consist(kind),
        passengers: 0,
        delayMin: Math.random() < 0.7 ? 0 : randomInt(1, 15),
      };
      train.passengers = boarding(train);
      this.trains.push(this.restart(train, now, metresPerPixel));
    }
    this.draw();
    if (document.hidden || this.trains.length === 0) this.pause();
    else if (!this.frame) {
      this.lastFrame = now;
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private metresPerPixel(): number {
    const latitude = this.map.getCenter().lat;
    return (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** this.map.getZoom());
  }

  /** Length of `train` on the screen, in pixels, at the size of the trains `size`. */
  private static lengthPx(train: Train, size: number): number {
    return train.vehicles.reduce((sum, v) => sum + TRAIN_PARTS[v.part].length + COUPLING_PX, -COUPLING_PX) * size;
  }

  /** Puts `train` back running on a point of its route in view, whole, fading in. */
  private restart(train: Train, now: number, metresPerPixel: number): Train {
    const length = TrainTraffic.lengthPx(train, sizeAt(this.map.getZoom())) * metresPerPixel;
    train.direction = Math.random() < 0.5 ? 1 : -1;
    const at = startIn(train.route, this.bounds);
    const [min, max] = train.direction === 1 ? [length, train.route.length] : [0, train.route.length - length];
    train.at = min <= max ? Math.min(Math.max(at, min), max) : train.direction === 1 ? train.route.length : 0;
    train.speed = SPEED_PX_S * KINDS[train.kind].speed;
    train.dwellUntil = 0;
    train.bornAt = now;
    this.locate(train, metresPerPixel);
    return train;
  }

  /**
   * Places each vehicle behind the front of the train, heading along the
   * chord between its ends: it turns smoothly through the bends, the
   * vehicles following one another on the rails.
   */
  private locate(train: Train, metresPerPixel: number): void {
    const size = sizeAt(this.map.getZoom()) * metresPerPixel;
    const { route, direction } = train;
    let offset = 0;
    for (const vehicle of train.vehicles) {
      const length = TRAIN_PARTS[vehicle.part].length * size;
      const front = pointAt(route, train.at - direction * offset);
      const rear = pointAt(route, train.at - direction * (offset + length));
      vehicle.position = pointAt(route, train.at - direction * (offset + length / 2));
      vehicle.bearing = bearing(rear, front) + (vehicle.reversed ? 180 : 0);
      offset += length + COUPLING_PX * size;
    }
  }

  /** At the end of the route: the rear becomes the front, the vehicles turned around. */
  private turnAround(train: Train, metresPerPixel: number): void {
    const length = TrainTraffic.lengthPx(train, sizeAt(this.map.getZoom())) * metresPerPixel;
    train.at -= train.direction * length;
    train.direction = train.direction === 1 ? -1 : 1;
    train.vehicles.reverse();
    for (const vehicle of train.vehicles) vehicle.reversed = !vehicle.reversed;
  }

  private readonly pause = () => {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    setTrainRolling(0);
  };

  private readonly tick = (time: number) => {
    this.frame = requestAnimationFrame(this.tick);
    const elapsed = time - this.lastFrame;
    if (elapsed < FRAME_MS) return;
    this.lastFrame = time;
    // A long frame, after the browser throttled the page, does not teleport the trains.
    const seconds = Math.min(elapsed, 100) / 1000;
    const metresPerPixel = this.metresPerPixel();
    this.bounds = this.map.getBounds().toArray().flat() as Bounds;
    let rolling = 0;
    for (const train of this.trains) {
      if (train.dwellUntil > 0) {
        if (time >= train.dwellUntil) {
          train.dwellUntil = 0;
          whistle();
        } else {
          this.locate(train, metresPerPixel);
          continue;
        }
      }
      const cruise = SPEED_PX_S * KINDS[train.kind].speed;
      const remainingPx = (train.direction === 1 ? train.route.length - train.at : train.at) / metresPerPixel;
      // Speeding up to cruise, braking to stop at the end of the link.
      const braking = Math.sqrt(2 * ACCEL_PX_S2 * remainingPx);
      train.speed = Math.max(CREEP_PX_S, Math.min(train.speed + ACCEL_PX_S2 * seconds, cruise, braking));
      const step = train.speed * seconds;
      rolling += train.speed / cruise;
      if (step >= remainingPx) {
        train.at = train.direction === 1 ? train.route.length : 0;
        train.speed = 0;
        train.dwellUntil = time + DWELL_MS;
        this.turnAround(train, metresPerPixel);
        // Some get off, others get on.
        train.passengers = boarding(train);
        brake();
      } else {
        train.at += train.direction * step * metresPerPixel;
      }
      this.locate(train, metresPerPixel);
      // Out of view on a long link: back on a part in view rather than running unseen.
      const rear = train.vehicles[train.vehicles.length - 1].position;
      if (train.id !== this.selected && !inside(train.vehicles[0].position, this.bounds) && !inside(rear, this.bounds)) {
        this.restart(train, time, metresPerPixel);
      }
    }
    setTrainRolling(Math.sqrt(rolling / MAX_TRAINS));
    this.follow(seconds);
    this.draw();
  };

  /** Brings the train followed to the focus point, unless the user is moving the map. */
  private follow(seconds: number): void {
    if (!this.following || this.map.isMoving()) return;
    const train = this.trains.find((t) => t.id === this.selected);
    if (!train) return;
    const middle = train.vehicles[train.vehicles.length >> 1].position;
    const target = this.map.project(middle as [number, number]);
    const focus = this.focusPoint();
    const dx = target.x - focus.x;
    const dy = target.y - focus.y;
    if (Math.hypot(dx, dy) < 0.5) return;
    const k = 1 - Math.exp(-seconds / FOLLOW_S);
    const { clientWidth, clientHeight } = this.map.getContainer();
    const center = this.map.unproject([clientWidth / 2 + dx * k, clientHeight / 2 + dy * k]);
    this.map.jumpTo({ center }, { [TRAIN_FOLLOW_EVENT]: true });
  }

  private readonly redraw = () => {
    this.empty = false;
    this.draw();
  };

  private readonly draw = () => {
    const source = this.map.getSource<GeoJSONSource>(TRAINS_SOURCE);
    if (!source) return;
    if (this.trains.length === 0) {
      if (!this.empty) source.setData(EMPTY);
      this.empty = true;
      return;
    }
    this.empty = false;
    const now = performance.now();
    const features: Feature<Point>[] = [];
    for (const train of this.trains) {
      const opacity = Math.min(1, (now - train.bornAt) / FADE_MS);
      const suffix = train.id === this.selected ? SELECTED_SUFFIX : "";
      for (const vehicle of train.vehicles) {
        features.push({
          type: "Feature",
          properties: { train: train.id, image: TRAIN_PARTS[vehicle.part].image + suffix, bearing: vehicle.bearing, opacity },
          geometry: { type: "Point", coordinates: vehicle.position },
        });
      }
    }
    source.setData({ type: "FeatureCollection", features });
  };
}

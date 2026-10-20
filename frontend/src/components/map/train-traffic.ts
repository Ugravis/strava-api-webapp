import type { Feature, FeatureCollection, LineString, Point, Position } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { setTrainRolling, whistle } from "@/lib/sound/train-sound";

/** Source of the trains, drawn by the stations layer. */
export const TRAINS_SOURCE = "station-trains";
/** Zoom from which the trains fade in, with the station icons. */
export const TRAINS_MIN_ZOOM = 12;

/** At most this many trains on the map, all lines together: dense cities stay light. */
const MAX_TRAINS = 12;
/** About 30 frames a second: smooth enough for a train, half the work of the screen rate. */
const FRAME_MS = 1000 / 30;
/** Speed on the screen, in pixels a second, whatever the zoom: a train is always seen moving. */
const SPEED_PX_S = 40;
/** Stop at each station, in milliseconds, before leaving the other way. */
const DWELL_MS = 2500;
/** Fade in of a new train, in milliseconds. */
const FADE_MS = 800;
/** Links shorter than this, in metres, carry no train: it would only turn around. */
const MIN_ROUTE_M = 300;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const METRES_PER_DEGREE = 111_320;

type Bounds = [west: number, south: number, east: number, north: number];

/** A link unlocked, measured once: where a train is along it follows from its distance. */
interface Route {
  coords: Position[];
  /** Distance from the start to each point, in metres. */
  along: number[];
  length: number;
  bounds: Bounds;
}

interface Train {
  route: Route;
  /** Distance from the start of the route, in metres. */
  at: number;
  direction: 1 | -1;
  /** End of the stop at a station, in milliseconds of `performance.now()`; 0 while moving. */
  dwellUntil: number;
  bornAt: number;
  position: Position;
  bearing: number;
}

const EMPTY: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

function metres(a: Position, b: Position): number {
  const dx = (b[0] - a[0]) * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot(dx, b[1] - a[1]) * METRES_PER_DEGREE;
}

function route(coords: Position[]): Route | null {
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
  return length >= MIN_ROUTE_M ? { coords, along, length, bounds } : null;
}

/** Position and heading, in degrees clockwise from north, `at` metres along `route`. */
function pointAlong({ coords, along }: Route, at: number, direction: 1 | -1): { position: Position; bearing: number } {
  let low = 0;
  let high = along.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (along[middle] <= at) low = middle;
    else high = middle;
  }
  const [a, b] = [coords[low], coords[high]];
  const span = along[high] - along[low];
  const t = span > 0 ? (at - along[low]) / span : 0;
  const position = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const dx = (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180);
  const bearing = (Math.atan2(dx, b[1] - a[1]) * 180) / Math.PI + (direction === 1 ? 0 : 180);
  return { position, bearing };
}

function overlaps(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** A distance along `route` at one of its points in view: a long link mostly out of view still shows its train. */
function startIn({ coords, along, length }: Route, bounds: Bounds): number {
  const inView: number[] = [];
  coords.forEach(([lon, lat], i) => {
    if (lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]) inView.push(along[i]);
  });
  return inView.length > 0 ? inView[Math.floor(Math.random() * inView.length)] : Math.random() * length;
}

/**
 * Trains moving back and forth along the unlocked links in view, with their
 * sound. The animation only runs zoomed in, with the stations shown, the map
 * still and the tab visible; the trains are picked again once the map stops.
 */
export class TrainTraffic {
  private routes: Route[] = [];
  private trains: Train[] = [];
  private visible: boolean;
  private frame = 0;
  private lastFrame = 0;
  /** Whether the source is known empty: no data sent again while no train runs. */
  private empty = false;
  /** The map in view when the trains were last dispatched. */
  private bounds: Bounds = [0, 0, 0, 0];

  constructor(
    private readonly map: MapLibreMap,
    visible: boolean,
  ) {
    this.visible = visible;
    map.on("movestart", this.pause);
    map.on("moveend", this.dispatch);
    // A new style has an empty source: the trains are drawn again.
    map.on("style.load", this.redraw);
    document.addEventListener("visibilitychange", this.dispatch);
  }

  /** Runs trains on `links`, replacing those of the previous links. */
  setLinks(links: FeatureCollection<LineString>): void {
    this.routes = links.features.map((link) => route(link.geometry.coordinates)).filter((r) => r !== null);
    this.trains = [];
    this.dispatch();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.dispatch();
  }

  destroy(): void {
    this.pause();
    this.map.off("movestart", this.pause);
    this.map.off("moveend", this.dispatch);
    this.map.off("style.load", this.redraw);
    document.removeEventListener("visibilitychange", this.dispatch);
  }

  private active(): boolean {
    return this.visible && this.map.getZoom() >= TRAINS_MIN_ZOOM;
  }

  /** Keeps the trains still in view, fills up to the cap from the other links in view, and runs them. */
  private readonly dispatch = () => {
    if (!this.active()) {
      this.trains = [];
      this.pause();
      this.draw();
      return;
    }
    const bounds = this.map.getBounds().toArray().flat() as Bounds;
    this.bounds = bounds;
    this.trains = this.trains.filter((train) => overlaps(train.route.bounds, bounds));
    const used = new Set(this.trains.map((train) => train.route));
    const free = this.routes.filter((r) => !used.has(r) && overlaps(r.bounds, bounds));
    const now = performance.now();
    while (this.trains.length < MAX_TRAINS && free.length > 0) {
      const [picked] = free.splice(Math.floor(Math.random() * free.length), 1);
      const train: Train = { route: picked, at: 0, direction: 1, dwellUntil: 0, bornAt: now, position: [0, 0], bearing: 0 };
      this.trains.push(this.restart(train, now));
    }
    this.draw();
    if (document.hidden || this.map.isMoving() || this.trains.length === 0) this.pause();
    else if (!this.frame) {
      this.lastFrame = now;
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  /** Puts `train` back on a point of its route in view, fading in. */
  private restart(train: Train, now: number): Train {
    train.at = startIn(train.route, this.bounds);
    train.direction = Math.random() < 0.5 ? 1 : -1;
    train.dwellUntil = 0;
    train.bornAt = now;
    this.locate(train);
    return train;
  }

  private locate(train: Train): void {
    const { position, bearing } = pointAlong(train.route, train.at, train.direction);
    train.position = position;
    train.bearing = bearing;
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
    const latitude = this.map.getCenter().lat;
    const metresPerPixel = (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** this.map.getZoom());
    const step = SPEED_PX_S * metresPerPixel * seconds;
    let moving = 0;
    for (const train of this.trains) {
      if (train.dwellUntil > 0) {
        if (time < train.dwellUntil) continue;
        train.dwellUntil = 0;
        whistle();
      }
      moving++;
      train.at += train.direction * step;
      if (train.at <= 0 || train.at >= train.route.length) {
        // At the station: a stop, then back the other way.
        train.at = Math.min(Math.max(train.at, 0), train.route.length);
        train.direction = train.direction === 1 ? -1 : 1;
        train.dwellUntil = time + DWELL_MS;
      }
      this.locate(train);
      // Out of view on a long link: back on a part in view rather than running unseen.
      const [lon, lat] = train.position;
      const [west, south, east, north] = this.bounds;
      if (lon < west || lon > east || lat < south || lat > north) this.restart(train, time);
    }
    setTrainRolling(Math.sqrt(moving / MAX_TRAINS));
    this.draw();
  };

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
    const features: Feature<Point>[] = this.trains.map((train) => ({
      type: "Feature",
      properties: { bearing: train.bearing, opacity: Math.min(1, (now - train.bornAt) / FADE_MS) },
      geometry: { type: "Point", coordinates: train.position },
    }));
    source.setData({ type: "FeatureCollection", features });
  };
}

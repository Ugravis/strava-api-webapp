import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LngLatBounds,
  Map as MapLibreMap,
} from "maplibre-gl";
import { FADE_ZOOMS } from "./map-style";
import { realScale } from "./real-scale";

/**
 * The ticks across the railway: one symbol by tick, placed from the whole
 * line rather than from its tiles, so that none is cut or shifted at their
 * borders. Only those around the view are laid out, at both spacings at
 * once: zooming in only fades the finer ones in, with no new layout.
 */

/** The ticks appear from this zoom. */
export const TIES_MIN_ZOOM = 14;
export const TIES_SOURCE = "rail-ties-ticks";
export const TIES_LAYER = "rail-links-ties";
const TIE_IMAGE = "rail-tie";

/** A tick, in pixels below the real scale: its length across the line, its width along it and the radius of its corners. */
const TIE = { length: 7.5, width: 1.4, radius: 0.55 } as const;
/** Opaque border around each tick, in pixels below the real scale. */
const TIE_BORDER = 0.5;
/** Metres between two ticks at `TIES_MIN_ZOOM`, halved from the next zoom level by those in between. */
const TIE_SPACING_M = 32;
/** The ticks in between start fading in at this share of the fade of the others, and end with it. */
const FINE_FADE_START = 0.6;
/** The ticks are laid out over the view and this share of it on each side: a small move does not lay them out again. */
const VIEW_MARGIN = 0.5;

/** Texels of the image by pixel of the tick: its distance field stays smooth. */
const SDF_SCALE = 8;
/** Texels of distance field around the tick: the border fits in it. */
const SDF_PAD = 6;
/** Fall of the distance field by texel, and its value on the edge, as MapLibre reads it. */
const SDF_STEP = 1 / 8;
const SDF_EDGE = 0.75;

const METRES_PER_DEGREE = 111_320;

interface Tie {
  gained: boolean;
  /** Bounding box of the line: west, south, east, north. */
  box: [number, number, number, number];
  coords: [number, number][];
  /** Metres from the start of the line to each of its points. */
  along: number[];
}

interface TieState {
  ties: Tie[];
  /** The area the ticks laid out cover, null when none are. */
  laid: [number, number, number, number] | null;
}

const states = new WeakMap<MapLibreMap, TieState>();
const listening = new WeakSet<MapLibreMap>();

const EMPTY: FeatureCollection<Point> = { type: "FeatureCollection", features: [] };

/** Metres between `a` and `b`, flat at their latitude: precise enough over a segment of track. */
function metres(a: [number, number], b: [number, number]): number {
  const cos = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * cos, b[1] - a[1]) * METRES_PER_DEGREE;
}

function prepare(lines: FeatureCollection<LineString, { gained?: boolean }>): Tie[] {
  return lines.features.map(({ geometry, properties }) => {
    const coords = geometry.coordinates as [number, number][];
    const along = [0];
    const box: Tie["box"] = [Infinity, Infinity, -Infinity, -Infinity];
    coords.forEach(([lng, lat], i) => {
      if (i > 0) along.push(along[i - 1] + metres(coords[i - 1], coords[i]));
      box[0] = Math.min(box[0], lng);
      box[1] = Math.min(box[1], lat);
      box[2] = Math.max(box[2], lng);
      box[3] = Math.max(box[3], lat);
    });
    return { gained: properties.gained ?? false, box, coords, along };
  });
}

function viewBox(bounds: LngLatBounds): [number, number, number, number] {
  const dx = (bounds.getEast() - bounds.getWest()) * VIEW_MARGIN;
  const dy = (bounds.getNorth() - bounds.getSouth()) * VIEW_MARGIN;
  return [
    bounds.getWest() - dx,
    bounds.getSouth() - dy,
    bounds.getEast() + dx,
    bounds.getNorth() + dy,
  ];
}

const inside = (box: Tie["box"], [lng, lat]: [number, number]) =>
  lng >= box[0] && lng <= box[2] && lat >= box[1] && lat <= box[3];

const overlaps = (a: Tie["box"], b: Tie["box"]) =>
  a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];

/** The ticks of `ties` in `box`, every half `TIE_SPACING_M` from the start of each line, turned with it; `fine` those in between. */
function layOut(ties: Tie[], box: Tie["box"]): FeatureCollection<Point> {
  const spacing = TIE_SPACING_M / 2;
  const features: Feature<Point>[] = [];
  for (const tie of ties) {
    if (!overlaps(tie.box, box)) continue;
    const { coords, along, gained } = tie;
    for (let i = 1; i < coords.length; i++) {
      const [a, b] = [coords[i - 1], coords[i]];
      if (!overlaps([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])], box)) continue;
      const length = along[i] - along[i - 1];
      if (length === 0) continue;
      // In the projection of the map: north up, angles as on screen.
      const dx = b[0] - a[0];
      const dy = mercatorY(b[1]) - mercatorY(a[1]);
      const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
      for (let d = Math.ceil(along[i - 1] / spacing) * spacing; d < along[i]; d += spacing) {
        const t = (d - along[i - 1]) / length;
        const point: [number, number] = [a[0] + dx * t, a[1] + (b[1] - a[1]) * t];
        if (!inside(box, point)) continue;
        features.push({
          type: "Feature",
          properties: { bearing, gained, fine: Math.round(d / spacing) % 2 === 1 },
          geometry: { type: "Point", coordinates: point },
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

/** Latitude in degrees of Mercator: the same scale as the longitude. */
function mercatorY(lat: number): number {
  return (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
}

/** Lays the ticks out again when the view leaves the area laid out; none below their zoom or hidden. */
function refresh(map: MapLibreMap): void {
  const state = states.get(map);
  const source = map.getSource<GeoJSONSource>(TIES_SOURCE);
  if (!state || !source) return;
  const shown = map.getLayoutProperty(TIES_LAYER, "visibility") !== "none";
  if (!shown || map.getZoom() < TIES_MIN_ZOOM) {
    if (state.laid) source.setData(EMPTY);
    state.laid = null;
    return;
  }
  const bounds = map.getBounds();
  const { laid } = state;
  if (
    laid &&
    inside(laid, [bounds.getWest(), bounds.getSouth()]) &&
    inside(laid, [bounds.getEast(), bounds.getNorth()])
  )
    return;
  const box = viewBox(bounds);
  state.laid = box;
  source.setData(layOut(state.ties, box));
}

/** The image of a tick, as a distance field: recoloured by the layer, bordered by its halo. */
function tieImage(): ImageData {
  const w = TIE.length * SDF_SCALE;
  const h = TIE.width * SDF_SCALE;
  const r = TIE.radius * SDF_SCALE;
  const width = Math.ceil(w + 2 * SDF_PAD);
  const height = Math.ceil(h + 2 * SDF_PAD);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Signed distance to the rounded rectangle, outward positive.
      const qx = Math.abs(x + 0.5 - width / 2) - (w / 2 - r);
      const qy = Math.abs(y + 0.5 - height / 2) - (h / 2 - r);
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      data[(y * width + x) * 4 + 3] = Math.round(Math.min(1, Math.max(0, SDF_EDGE - d * SDF_STEP)) * 255);
    }
  }
  return new ImageData(data, width, height);
}

/**
 * Adds the ticks below `before`, in `color` bordered by `casing`, and lays
 * them out with the view.
 */
export function addRailTies(
  map: MapLibreMap,
  lines: FeatureCollection<LineString, { gained?: boolean }>,
  color: ExpressionSpecification,
  casing: string,
  visibility: "visible" | "none",
  before: string | undefined,
): void {
  if (!map.hasImage(TIE_IMAGE)) map.addImage(TIE_IMAGE, tieImage(), { sdf: true });
  states.set(map, { ties: prepare(lines), laid: null });
  // No tiles finer than the first zoom of the ticks: zooming in cuts none again.
  map.addSource(TIES_SOURCE, { type: "geojson", data: EMPTY, buffer: 0, maxzoom: TIES_MIN_ZOOM });
  map.addLayer(
    {
      id: TIES_LAYER,
      type: "symbol",
      source: TIES_SOURCE,
      minzoom: TIES_MIN_ZOOM,
      layout: {
        visibility,
        "icon-image": TIE_IMAGE,
        "icon-size": realScale([[TIES_MIN_ZOOM, 1 / SDF_SCALE]]),
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        // No sort by the screen: the order of the source, the gains last.
        "symbol-z-order": "source",
      },
      paint: {
        "icon-color": color,
        "icon-halo-color": casing,
        "icon-halo-width": realScale([[TIES_MIN_ZOOM, TIE_BORDER]]),
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          TIES_MIN_ZOOM,
          0,
          TIES_MIN_ZOOM + FINE_FADE_START * FADE_ZOOMS,
          ["case", ["get", "fine"], 0, FINE_FADE_START],
          TIES_MIN_ZOOM + FADE_ZOOMS,
          1,
        ],
      },
    },
    before,
  );
  if (!listening.has(map)) {
    listening.add(map);
    // While moving: the ticks are there as soon as the view leaves the area laid out; the check costs nothing otherwise.
    map.on("move", () => refresh(map));
  }
  refresh(map);
}

/** Lays the ticks out again from new lines. */
export function setRailTies(
  map: MapLibreMap,
  lines: FeatureCollection<LineString, { gained?: boolean }>,
): void {
  const state = states.get(map);
  if (!state) return;
  state.ties = prepare(lines);
  state.laid = null;
  refresh(map);
}

/** Lays the ticks out, or drops them, after their layer is shown or hidden. */
export const refreshRailTies = refresh;

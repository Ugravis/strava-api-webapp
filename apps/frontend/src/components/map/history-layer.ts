import type { ExpressionSpecification, LayerSpecification, Map as MapLibreMap } from "maplibre-gl";
import type { HistoryMode } from "@/lib/api/types";
import { belowActivityTiles } from "./activity-tiles-layer";
import { fadeIn, type MapPalette } from "./map-style";
import { rgba, SUBTILE_MIN_ZOOM, subtileOpacity } from "./tile-layers";

/** What the history tool draws on the map. */
export interface MapHistory {
  mode: HistoryMode;
  /** Instant the first visits are compared with. */
  instant: string;
  /** Version of the first visits: a new one reloads the tiles. */
  version: string;
}

const SOURCE_LAYERS = { tiles: "tiles", tilesOutline: "tiles_outline" } as const;
/** The backend serves the tiles down to this zoom; the map stretches them beyond. */
const TILES_MAX_ZOOM = 12;
/** The outline appears with the grid of the large tiles. */
const OUTLINE_MIN_ZOOM = 11;
/** Up to this zoom, the fill of the state is at its strongest; it lightens as the streets appear. */
const STRONG_FILL_ZOOM = 7;
const LIGHT_FILL_ZOOM = 11;
/** Cross-fade from one history to the next, in milliseconds. */
const FADE_MS = 250;
/** A history still loading after this delay is shown as it is: a slow tile does not hold the others back. */
const LOAD_TIMEOUT_MS = 4_000;
/** Prefix of the sources and layers of the history. */
const PREFIX = "history-";

/** Where the ground layers of today's tiles go: below the history and the activity shown. */
export function belowHistory(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.id.startsWith(PREFIX))?.id ?? belowActivityTiles(map);
}

/** Colors of each mode: the gained tiles in the pink of the gains, opaque; the past state in the green of the tiles. */
function modePaint(mode: HistoryMode, palette: MapPalette) {
  if (mode === "gained") {
    return {
      fillColor: palette.activityTile,
      fillOpacity: 1 as number | ExpressionSpecification,
      outline: palette.activitySubtile,
      subtile: rgba(palette.activitySubtile, 1),
    };
  }
  return {
    fillColor: palette.tile,
    fillOpacity: [
      "interpolate",
      ["linear"],
      ["zoom"],
      STRONG_FILL_ZOOM,
      Math.min(1, palette.tileOpacity * 2.5),
      LIGHT_FILL_ZOOM,
      palette.tileOpacity,
    ] as ExpressionSpecification,
    outline: palette.tileOutline,
    subtile: rgba(palette.subtile, palette.subtileOpacity),
  };
}

// Absolute: MapLibre fetches the tiles from its worker.
function query({ mode, instant, version }: MapHistory): string {
  return new URLSearchParams({ mode, date: instant, v: version }).toString();
}
const vectorUrl = (history: MapHistory) =>
  `${window.location.origin}/api/tiles/history/vector/{z}/{x}/{y}?${query(history)}`;
const imagesUrl = (history: MapHistory, palette: MapPalette) =>
  `${window.location.origin}/api/tiles/history/raster/{z}/{x}/{y}?${query(history)}&color=${modePaint(history.mode, palette).subtile}`;

/** One history drawn on the map: its own sources and layers, so that the previous one stays until it is loaded. */
interface Drawing {
  /** Addresses of its tiles: another history needs another drawing. */
  key: string;
  vector: string;
  raster: string;
  fill: string;
  image: string;
  outline: string;
  /** Opacities once shown: the drawing fades in from 0. */
  opacities: { fill: number | ExpressionSpecification; image: ExpressionSpecification; outline: ExpressionSpecification };
}

/** The history shown by each map, and the next one while it loads. */
interface HistoryState {
  shown: Drawing | null;
  next: Drawing | null;
  count: number;
}
const states = new WeakMap<MapLibreMap, HistoryState>();

/** State of `map`, forgetting the drawings dropped with a previous style. */
function stateOf(map: MapLibreMap): HistoryState {
  let state = states.get(map);
  if (!state) {
    state = { shown: null, next: null, count: 0 };
    states.set(map, state);
  }
  const exists = (drawing: Drawing | null) => drawing && map.getSource(drawing.vector) ? drawing : null;
  state.shown = exists(state.shown);
  state.next = exists(state.next);
  return state;
}

function setOpacities(map: MapLibreMap, drawing: Drawing, shown: boolean): void {
  if (!map.getLayer(drawing.fill)) return;
  map.setPaintProperty(drawing.fill, "fill-opacity", shown ? drawing.opacities.fill : 0);
  map.setPaintProperty(drawing.image, "raster-opacity", shown ? drawing.opacities.image : 0);
  map.setPaintProperty(drawing.outline, "line-opacity", shown ? drawing.opacities.outline : 0);
}

function removeDrawing(map: MapLibreMap, drawing: Drawing): void {
  for (const id of [drawing.outline, drawing.image, drawing.fill]) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [drawing.vector, drawing.raster]) if (map.getSource(id)) map.removeSource(id);
}

/** Fades `drawing` out, then removes it. */
function fadeOut(map: MapLibreMap, drawing: Drawing): void {
  setOpacities(map, drawing, false);
  setTimeout(() => removeDrawing(map, drawing), FADE_MS);
}

/**
 * Adds the sources and layers of `history`, invisible, over the history
 * shown: below the activity shown, the outline below `beforeId`.
 */
function addDrawing(
  map: MapLibreMap,
  history: MapHistory,
  palette: MapPalette,
  beforeId: string | undefined,
  key: string,
  index: number,
): Drawing {
  const name = (kind: string) => `${PREFIX}${kind}-${index}`;
  const paint = modePaint(history.mode, palette);
  const drawing: Drawing = {
    key,
    vector: name("tiles"),
    raster: name("subtiles"),
    fill: name("tiles-fill"),
    image: name("subtiles-image"),
    outline: name("tiles-outline"),
    opacities: { fill: paint.fillOpacity, image: subtileOpacity(), outline: fadeIn(OUTLINE_MIN_ZOOM, 0.8) },
  };
  const transition = { duration: FADE_MS, delay: 0 };
  map.addSource(drawing.vector, { type: "vector", tiles: [vectorUrl(history)], maxzoom: TILES_MAX_ZOOM });
  // 512 pixels images over 256 pixels: sharp on high density screens.
  map.addSource(drawing.raster, {
    type: "raster",
    tiles: [imagesUrl(history, palette)],
    tileSize: 256,
    minzoom: SUBTILE_MIN_ZOOM,
    maxzoom: TILES_MAX_ZOOM,
  });
  const vector = (sourceLayer: string) => ({ source: drawing.vector, "source-layer": sourceLayer });
  // Rectangles along the axes: without antialiasing, the edges shared by two of them leave no seam.
  const ground: LayerSpecification[] = [
    {
      id: drawing.fill,
      type: "fill",
      ...vector(SOURCE_LAYERS.tiles),
      paint: {
        "fill-color": paint.fillColor,
        "fill-opacity": 0,
        "fill-opacity-transition": transition,
        "fill-antialias": false,
      },
    },
    {
      id: drawing.image,
      type: "raster",
      source: drawing.raster,
      minzoom: SUBTILE_MIN_ZOOM,
      // Nearest pixel: the edges of the small tiles stay sharp once stretched.
      paint: { "raster-opacity": 0, "raster-opacity-transition": transition, "raster-resampling": "nearest" },
    },
  ];
  const groundId = belowActivityTiles(map);
  for (const layer of ground) map.addLayer(layer, groundId);
  map.addLayer(
    {
      id: drawing.outline,
      type: "line",
      ...vector(SOURCE_LAYERS.tilesOutline),
      minzoom: OUTLINE_MIN_ZOOM,
      paint: { "line-color": paint.outline, "line-opacity": 0, "line-opacity-transition": transition, "line-width": 1 },
    },
    beforeId,
  );
  return drawing;
}

/** Calls `ready` once the tiles of `drawing` in view are loaded, or after `LOAD_TIMEOUT_MS`. */
function whenLoaded(map: MapLibreMap, drawing: Drawing, ready: () => void): void {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    map.off("sourcedata", check);
    clearTimeout(timer);
    ready();
  };
  const loaded = (id: string) => !map.getSource(id) || map.isSourceLoaded(id);
  const check = () => {
    if (loaded(drawing.vector) && loaded(drawing.raster)) finish();
  };
  const timer = setTimeout(finish, LOAD_TIMEOUT_MS);
  map.on("sourcedata", check);
}

/** Moments of a change of history, for what the map draws besides it. */
export interface HistoryCallbacks {
  /** The new history starts fading in, over the previous one. */
  onFadeIn: () => void;
  /** The new history is fully shown, the previous one gone. */
  onShown: () => void;
}

/**
 * Draws the history on the map as its ground, over today's tiles and below
 * the activity shown, or hides it (`history` null). Another history loads
 * while the previous one stays, then cross-fades with it. The small tiles
 * follow `subtiles`; the outline goes below `beforeId`.
 */
export function setHistory(
  map: MapLibreMap,
  history: MapHistory | null,
  palette: MapPalette,
  subtiles: boolean,
  beforeId: string | undefined,
  { onFadeIn, onShown }: HistoryCallbacks,
): void {
  const state = stateOf(map);
  const showImage = (drawing: Drawing | null) => {
    if (drawing && map.getLayer(drawing.image)) {
      map.setLayoutProperty(drawing.image, "visibility", subtiles ? "visible" : "none");
    }
  };
  if (!history) {
    if (state.next) removeDrawing(map, state.next);
    if (state.shown) fadeOut(map, state.shown);
    state.shown = state.next = null;
    onFadeIn();
    onShown();
    return;
  }
  const key = `${vectorUrl(history)} ${imagesUrl(history, palette)}`;
  if (state.shown?.key === key) {
    // Back to the history shown: the one loading is dropped.
    if (state.next) removeDrawing(map, state.next);
    state.next = null;
    showImage(state.shown);
    onFadeIn();
    onShown();
    return;
  }
  if (state.next?.key === key) {
    showImage(state.next);
    return;
  }
  // Only the latest history loads: the slider moves faster than the tiles arrive.
  if (state.next) removeDrawing(map, state.next);
  const next = addDrawing(map, history, palette, beforeId, key, ++state.count);
  state.next = next;
  showImage(next);
  whenLoaded(map, next, () => {
    if (state.next !== next || !map.getSource(next.vector)) return;
    const previous = state.shown;
    state.shown = next;
    state.next = null;
    setOpacities(map, next, true);
    if (previous) fadeOut(map, previous);
    onFadeIn();
    setTimeout(() => {
      if (state.shown === next) onShown();
    }, FADE_MS);
  });
}

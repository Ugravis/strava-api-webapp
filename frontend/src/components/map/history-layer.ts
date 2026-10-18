import type {
  ExpressionSpecification,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import type { HistoryMode } from "@/lib/api/types";
import { belowActivityTiles } from "./activity-tiles-layer";
import type { MapPalette } from "./map-style";
import { fadeIn, rgba, subtileOpacity } from "./tile-layers";

/** What the history tool draws on the map. */
export interface MapHistory {
  mode: HistoryMode;
  /** Instant the first visits are compared with. */
  instant: string;
  /** Version of the first visits: a new one reloads the tiles. */
  version: string;
}

/** Large tiles of the history, served as vector tiles, and small tiles, served as images. */
const VECTOR_SOURCE = "history-tiles";
const RASTER_SOURCE = "history-subtiles";
const SOURCE_LAYERS = { tiles: "tiles", tilesOutline: "tiles_outline" } as const;
/** The backend serves the tiles down to this zoom; the map stretches them beyond. */
const TILES_MAX_ZOOM = 12;
/** The images of the small tiles are served from this zoom. */
const SUBTILE_MIN_ZOOM = 5;
/** The outline appears with the grid of the large tiles. */
const OUTLINE_MIN_ZOOM = 11;
/** Up to this zoom, the fill of the state is at its strongest; it lightens as the streets appear. */
const STRONG_FILL_ZOOM = 7;
const LIGHT_FILL_ZOOM = 11;

/** Lowest layer of the history: the tiles of today, added later, go below it. */
export const HISTORY_GROUND_LAYER_ID = "history-tiles-fill";
const OUTLINE_LAYER_ID = "history-tiles-outline";
const IMAGE_LAYER_ID = "history-subtiles-image";
const LAYER_IDS = [HISTORY_GROUND_LAYER_ID, IMAGE_LAYER_ID, OUTLINE_LAYER_ID];

/** Where the ground layers of today's tiles go: below the history and the activity shown. */
export function belowHistory(map: MapLibreMap): string | undefined {
  return map.getLayer(HISTORY_GROUND_LAYER_ID) ? HISTORY_GROUND_LAYER_ID : belowActivityTiles(map);
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

// Absolute: MapLibre fetches the tiles from its worker. The version only
// changes the address, so that the tiles are requested again.
function query({ mode, instant, version }: MapHistory): string {
  return new URLSearchParams({ mode, date: instant, v: version }).toString();
}
const vectorUrl = (history: MapHistory) =>
  `${window.location.origin}/api/tiles/history/vector/{z}/{x}/{y}?${query(history)}`;
const imagesUrl = (history: MapHistory, palette: MapPalette) =>
  `${window.location.origin}/api/tiles/history/raster/{z}/{x}/{y}?${query(history)}&color=${modePaint(history.mode, palette).subtile}`;

/** Addresses of the tiles drawn by each map: the tiles are requested again only when they change. */
const drawnUrls = new WeakMap<MapLibreMap, { vector: string; images: string }>();

function addHistoryLayers(map: MapLibreMap, history: MapHistory, palette: MapPalette, beforeId: string | undefined) {
  const urls = { vector: vectorUrl(history), images: imagesUrl(history, palette) };
  drawnUrls.set(map, urls);
  map.addSource(VECTOR_SOURCE, { type: "vector", tiles: [urls.vector], maxzoom: TILES_MAX_ZOOM });
  // 512 pixels images over 256 pixels: sharp on high density screens.
  map.addSource(RASTER_SOURCE, {
    type: "raster",
    tiles: [urls.images],
    tileSize: 256,
    minzoom: SUBTILE_MIN_ZOOM,
    maxzoom: TILES_MAX_ZOOM,
  });
  const paint = modePaint(history.mode, palette);
  const vector = (sourceLayer: string) => ({ source: VECTOR_SOURCE, "source-layer": sourceLayer });
  // Rectangles along the axes: without antialiasing, the edges shared by two of them leave no seam.
  const ground: LayerSpecification[] = [
    {
      id: HISTORY_GROUND_LAYER_ID,
      type: "fill",
      ...vector(SOURCE_LAYERS.tiles),
      paint: { "fill-color": paint.fillColor, "fill-opacity": paint.fillOpacity, "fill-antialias": false },
    },
    {
      id: IMAGE_LAYER_ID,
      type: "raster",
      source: RASTER_SOURCE,
      minzoom: SUBTILE_MIN_ZOOM,
      // Nearest pixel: the edges of the small tiles stay sharp once stretched.
      paint: { "raster-opacity": subtileOpacity(), "raster-resampling": "nearest" },
    },
  ];
  const groundId = belowActivityTiles(map);
  for (const layer of ground) map.addLayer(layer, groundId);
  map.addLayer(
    {
      id: OUTLINE_LAYER_ID,
      type: "line",
      ...vector(SOURCE_LAYERS.tilesOutline),
      minzoom: OUTLINE_MIN_ZOOM,
      paint: { "line-color": paint.outline, "line-opacity": fadeIn(OUTLINE_MIN_ZOOM, 0.8), "line-width": 1 },
    },
    beforeId,
  );
}

function removeHistoryLayers(map: MapLibreMap): void {
  for (const id of LAYER_IDS) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [VECTOR_SOURCE, RASTER_SOURCE]) if (map.getSource(id)) map.removeSource(id);
}

/**
 * Draws the history on the map as its ground, over today's tiles and below
 * the activity shown, or hides it (`history` null). The small tiles follow
 * `subtiles`. The layers are added on first use, the outline below `beforeId`.
 */
export function setHistory(
  map: MapLibreMap,
  history: MapHistory | null,
  palette: MapPalette,
  subtiles: boolean,
  beforeId: string | undefined,
): void {
  const show = (id: string, visible: boolean) => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  };
  if (!history) {
    for (const id of LAYER_IDS) show(id, false);
    return;
  }
  const drawn = drawnUrls.get(map);
  if (!map.getSource(VECTOR_SOURCE) || drawn?.vector !== vectorUrl(history) || drawn.images !== imagesUrl(history, palette)) {
    // Another date, mode or version: the layers are drawn anew from new
    // sources. Given new addresses, a vector source whose first tiles were
    // empty kept drawing nothing.
    removeHistoryLayers(map);
    addHistoryLayers(map, history, palette, beforeId);
  }
  show(HISTORY_GROUND_LAYER_ID, true);
  show(OUTLINE_LAYER_ID, true);
  show(IMAGE_LAYER_ID, subtiles);
}

import type { FeatureCollection, LineString, Polygon } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
  RasterTileSource,
  VectorTileSource,
} from "maplibre-gl";
import type { TilesSummary } from "@/lib/api/types";
import {
  gridCollection,
  maxSquareCollection,
  SUBTILE_ZOOM,
  TILE_ZOOM,
  type TileZoom,
} from "@/lib/tiles/tile-geometry";
import { CLUSTER_COLOR, GRID_COLOR, SQUARE_COLOR, TILE_COLOR } from "./map-style";

/** Which levels of tiles the map shows, if any. The small tiles only come with the large ones. */
export type TileMode = "none" | "tiles" | "both";

/** Tiles of the user, served as vector tiles by the backend for each version of the tiles. */
const VECTOR_SOURCE = "user-tiles";
/**
 * Small tiles of the user, served as images: their size stays bounded
 * whatever the density of the tiles, down to the zoom of a whole country.
 */
const RASTER_SOURCE = "user-subtiles";
/** The backend serves the tiles down to this zoom; the map stretches them beyond. */
const TILES_MAX_ZOOM = 14;
/** Layers of the vector tiles. */
const SOURCE_LAYERS = {
  tiles: "tiles",
  tileCluster: "tile_cluster",
  subtiles: "subtiles",
} as const;
/** Opacity of the small tiles and of those of the largest cluster, drawn in the images. */
const SUBTILE_ALPHA = 0.4;
const SUBTILE_CLUSTER_ALPHA = 0.55;

const SOURCES = {
  tileSquare: "tile-max-square",
  subtileSquare: "subtile-max-square",
  tileGrid: "tile-grid",
  subtileGrid: "subtile-grid",
} as const;

/** The grids only appear once their cells are large enough to be aimed at, about 128 pixels. */
const TILE_GRID_MIN_ZOOM = 12;
const SUBTILE_GRID_MIN_ZOOM = 15;
/** In the combined view, the small tiles fade in from this zoom, where the backend starts serving their images. */
const SUBTILE_MIN_ZOOM = 5;
/** The small tiles can be picked from this zoom, where the backend serves them as vector tiles; below, a click picks the large tile. */
const SUBTILE_CLICK_MIN_ZOOM = 13;
/**
 * The outlines of the visited large tiles appear with their grid; the backend
 * merges the contiguous tiles below zoom 10, their outlines would not follow
 * the tiles.
 */
const TILE_OUTLINE_MIN_ZOOM = TILE_GRID_MIN_ZOOM;
/** Zooms over which a layer fades in after its minimum zoom. */
const FADE_ZOOMS = 1;

const LEVEL_LAYERS = {
  tiles: ["visited-tiles-fill", "tile-max-cluster-fill", "visited-tiles-outline", "tile-max-square-line"],
  subtiles: ["visited-subtiles-image", "visited-subtiles-fill", "subtile-grid-line", "subtile-max-square-line"],
} as const;
const ALL_LAYERS = [...LEVEL_LAYERS.tiles, ...LEVEL_LAYERS.subtiles, "tile-grid-line"];

/** Layers whose fill shows a visited tile, small tiles first: they react to the pointer. */
export const CLICKABLE_LAYERS = ["visited-subtiles-fill", "visited-tiles-fill"];
const LAYER_ZOOMS: Record<string, TileZoom> = {
  "visited-subtiles-fill": SUBTILE_ZOOM,
  "visited-tiles-fill": TILE_ZOOM,
};

const VISIBLE_LAYERS: Record<TileMode, string[]> = {
  none: [],
  tiles: [...LEVEL_LAYERS.tiles, "tile-grid-line"],
  both: [...ALL_LAYERS],
};

/** Opacity rising from 0 at `minZoom` to `opacity` one zoom later: the layer appears smoothly. */
function fadeIn(minZoom: number, opacity: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], minZoom, 0, minZoom + FADE_ZOOMS, opacity];
}

/** What the map draws of the tiles: the vector tiles of a version, and the largest squares. */
export interface TileData {
  /** Null while loading. */
  version: string | null;
  tileSquare: FeatureCollection<Polygon>;
  subtileSquare: FeatureCollection<Polygon>;
}

const EMPTY: FeatureCollection<never> = { type: "FeatureCollection", features: [] };
const EMPTY_LINES: FeatureCollection<LineString> = EMPTY;

export function tileData(summary: TilesSummary | null): TileData {
  return {
    version: summary?.version ?? null,
    tileSquare: summary ? maxSquareCollection(summary.tiles.maxSquare, TILE_ZOOM) : EMPTY,
    subtileSquare: summary ? maxSquareCollection(summary.subtiles.maxSquare, SUBTILE_ZOOM) : EMPTY,
  };
}

/** `#rrggbb` and an opacity as `rrggbbaa`. */
function rgba(color: string, alpha: number): string {
  return `${color.slice(1)}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

// Absolute: MapLibre fetches the tiles from its worker.
function tilesUrl(version: string): string {
  return `${window.location.origin}/api/tiles/vector/{z}/{x}/{y}?v=${version}`;
}

function imagesUrl(version: string): string {
  const colors = `color=${rgba(TILE_COLOR, SUBTILE_ALPHA)}&cluster=${rgba(CLUSTER_COLOR, SUBTILE_CLUSTER_ALPHA)}`;
  return `${window.location.origin}/api/tiles/raster/{z}/{x}/{y}?v=${version}&${colors}`;
}

/** Levels of the tile under the pointer, the most detailed first, or none when no tile is shown. */
export function clickableZooms(mode: TileMode, mapZoom: number): TileZoom[] {
  switch (mode) {
    case "none":
      return [];
    case "tiles":
      return [TILE_ZOOM];
    case "both":
      return mapZoom >= SUBTILE_CLICK_MIN_ZOOM ? [SUBTILE_ZOOM, TILE_ZOOM] : [TILE_ZOOM];
  }
}

/** Level of the visited tile drawn at `point`, from the rendered features; null outside the tiles. */
export function visitedZoomAt(map: MapLibreMap, point: { x: number; y: number }, zooms: TileZoom[]): TileZoom | null {
  const layers = CLICKABLE_LAYERS.filter((id) => map.getLayer(id) && zooms.includes(LAYER_ZOOMS[id]));
  if (layers.length === 0) return null;
  const drawn = new Set(map.queryRenderedFeatures([point.x, point.y], { layers }).map((feature) => feature.layer.id));
  return zooms.find((zoom) => CLICKABLE_LAYERS.some((id) => LAYER_ZOOMS[id] === zoom && drawn.has(id))) ?? null;
}

/**
 * Adds the visited tiles, their achievements and the grids below `beforeId`,
 * hidden until a mode is set. Needs the version of the tiles: until then,
 * nothing is added.
 */
export function addTileLayers(map: MapLibreMap, data: TileData, beforeId: string | undefined): void {
  if (!data.version || map.getSource(VECTOR_SOURCE)) return;
  map.addSource(VECTOR_SOURCE, { type: "vector", tiles: [tilesUrl(data.version)], maxzoom: TILES_MAX_ZOOM });
  // 512 pixels images over 256 pixels: sharp on high density screens.
  map.addSource(RASTER_SOURCE, {
    type: "raster",
    tiles: [imagesUrl(data.version)],
    tileSize: 256,
    minzoom: SUBTILE_MIN_ZOOM,
    maxzoom: TILES_MAX_ZOOM,
  });
  map.addSource(SOURCES.tileSquare, { type: "geojson", data: data.tileSquare });
  map.addSource(SOURCES.subtileSquare, { type: "geojson", data: data.subtileSquare });
  map.addSource(SOURCES.tileGrid, { type: "geojson", data: EMPTY_LINES });
  map.addSource(SOURCES.subtileGrid, { type: "geojson", data: EMPTY_LINES });
  const layout = { visibility: "none" } as const;
  const vector = (sourceLayer: string) => ({ source: VECTOR_SOURCE, "source-layer": sourceLayer });
  // Bottom to top: fills, then grids, then the outlines of the squares. The
  // fills are rectangles along the axes: without antialiasing, the edges
  // shared by two of them leave no seam.
  const layers: LayerSpecification[] = [
    {
      id: "visited-tiles-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.tiles),
      layout,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": 0.22, "fill-antialias": false },
    },
    {
      id: "tile-max-cluster-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.tileCluster),
      layout,
      paint: { "fill-color": CLUSTER_COLOR, "fill-opacity": 0.3, "fill-antialias": false },
    },
    {
      id: "visited-tiles-outline",
      type: "line",
      ...vector(SOURCE_LAYERS.tiles),
      minzoom: TILE_OUTLINE_MIN_ZOOM,
      layout,
      paint: { "line-color": TILE_COLOR, "line-opacity": fadeIn(TILE_OUTLINE_MIN_ZOOM, 0.35), "line-width": 0.5 },
    },
    {
      id: "visited-subtiles-image",
      type: "raster",
      source: RASTER_SOURCE,
      minzoom: SUBTILE_MIN_ZOOM,
      layout,
      // Nearest pixel: the edges of the small tiles stay sharp once stretched.
      paint: { "raster-opacity": fadeIn(SUBTILE_MIN_ZOOM, 1), "raster-resampling": "nearest" },
    },
    {
      // Invisible: picks the small tile under the pointer, drawn by the images.
      id: "visited-subtiles-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.subtiles),
      minzoom: SUBTILE_CLICK_MIN_ZOOM,
      layout,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": 0 },
    },
    {
      id: "subtile-grid-line",
      type: "line",
      source: SOURCES.subtileGrid,
      minzoom: SUBTILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": fadeIn(SUBTILE_GRID_MIN_ZOOM, 0.15), "line-width": 0.5 },
    },
    {
      id: "tile-grid-line",
      type: "line",
      source: SOURCES.tileGrid,
      minzoom: TILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": fadeIn(TILE_GRID_MIN_ZOOM, 0.25), "line-width": 0.5 },
    },
    {
      id: "tile-max-square-line",
      type: "line",
      source: SOURCES.tileSquare,
      layout,
      paint: { "line-color": SQUARE_COLOR, "line-width": 3 },
    },
    {
      id: "subtile-max-square-line",
      type: "line",
      source: SOURCES.subtileSquare,
      layout,
      paint: { "line-color": SQUARE_COLOR, "line-width": 2, "line-dasharray": [2, 1] },
    },
  ];
  for (const layer of layers) map.addLayer(layer, beforeId);
}

/** Points the tiles to the current version and updates the squares; false when the layers are not added yet. */
export function setTileData(map: MapLibreMap, data: TileData): boolean {
  const source = map.getSource<VectorTileSource>(VECTOR_SOURCE);
  if (!source || !data.version) return false;
  const url = tilesUrl(data.version);
  if (source.tiles[0] !== url) source.setTiles([url]);
  const images = map.getSource<RasterTileSource>(RASTER_SOURCE);
  const imageUrl = imagesUrl(data.version);
  if (images && images.tiles[0] !== imageUrl) images.setTiles([imageUrl]);
  map.getSource<GeoJSONSource>(SOURCES.tileSquare)?.setData(data.tileSquare);
  map.getSource<GeoJSONSource>(SOURCES.subtileSquare)?.setData(data.subtileSquare);
  return true;
}

export function setTileMode(map: MapLibreMap, mode: TileMode): void {
  const visible = new Set(VISIBLE_LAYERS[mode]);
  for (const id of ALL_LAYERS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible.has(id) ? "visible" : "none");
    }
  }
  updateGrids(map, mode);
}

/** Draws the grids of the visible area, which change as the map moves. */
export function updateGrids(map: MapLibreMap, mode: TileMode): void {
  const bounds = map.getBounds();
  const area = { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() };
  const zoom = map.getZoom();
  const tileGrid = mode !== "none" && zoom >= TILE_GRID_MIN_ZOOM ? gridCollection(area, TILE_ZOOM) : EMPTY_LINES;
  const subtileGrid = mode === "both" && zoom >= SUBTILE_GRID_MIN_ZOOM ? gridCollection(area, SUBTILE_ZOOM) : EMPTY_LINES;
  map.getSource<GeoJSONSource>(SOURCES.tileGrid)?.setData(tileGrid);
  map.getSource<GeoJSONSource>(SOURCES.subtileGrid)?.setData(subtileGrid);
}

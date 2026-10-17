import type { FeatureCollection, LineString, Polygon } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
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
/** The backend serves the tiles down to this zoom; the map stretches them beyond. */
const VECTOR_MAX_ZOOM = 14;
/** Layers of the vector tiles. */
const SOURCE_LAYERS = {
  tiles: "tiles",
  tileCluster: "tile_cluster",
  subtiles: "subtiles",
  subtileCluster: "subtile_cluster",
} as const;

const SOURCES = {
  tileSquare: "tile-max-square",
  subtileSquare: "subtile-max-square",
  tileGrid: "tile-grid",
  subtileGrid: "subtile-grid",
} as const;

/** The grids only make sense once their cells are a few pixels wide. */
const TILE_GRID_MIN_ZOOM = 9;
const SUBTILE_GRID_MIN_ZOOM = 13;
/** In the combined view, the small tiles fade in from this zoom, where the backend starts serving them. */
const SUBTILE_MIN_ZOOM = 10;
/** The small tiles can be picked from this zoom; below, a click picks the large tile. */
const SUBTILE_CLICK_MIN_ZOOM = 12;
/** Below this zoom, the backend merges the contiguous tiles: their outlines would not follow the tiles. */
const TILE_OUTLINE_MIN_ZOOM = 10;
/** Zooms over which a layer fades in after its minimum zoom. */
const FADE_ZOOMS = 1;

const LEVEL_LAYERS = {
  tiles: ["visited-tiles-fill", "tile-max-cluster-fill", "visited-tiles-outline", "tile-max-square-line"],
  subtiles: ["visited-subtiles-fill", "subtile-max-cluster-fill", "subtile-grid-line", "subtile-max-square-line"],
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

function tilesUrl(version: string): string {
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/tiles/vector/{z}/{x}/{y}?v=${version}`;
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
  map.addSource(VECTOR_SOURCE, { type: "vector", tiles: [tilesUrl(data.version)], maxzoom: VECTOR_MAX_ZOOM });
  map.addSource(SOURCES.tileSquare, { type: "geojson", data: data.tileSquare });
  map.addSource(SOURCES.subtileSquare, { type: "geojson", data: data.subtileSquare });
  map.addSource(SOURCES.tileGrid, { type: "geojson", data: EMPTY_LINES });
  map.addSource(SOURCES.subtileGrid, { type: "geojson", data: EMPTY_LINES });
  const layout = { visibility: "none" } as const;
  const vector = (sourceLayer: string) => ({ source: VECTOR_SOURCE, "source-layer": sourceLayer });
  // Bottom to top: fills, then grids, then the outlines of the squares.
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
      paint: { "line-color": TILE_COLOR, "line-opacity": fadeIn(TILE_OUTLINE_MIN_ZOOM, 0.6), "line-width": 1 },
    },
    {
      id: "visited-subtiles-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.subtiles),
      minzoom: SUBTILE_MIN_ZOOM,
      layout,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": fadeIn(SUBTILE_MIN_ZOOM, 0.35), "fill-antialias": false },
    },
    {
      id: "subtile-max-cluster-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.subtileCluster),
      minzoom: SUBTILE_MIN_ZOOM,
      layout,
      paint: { "fill-color": CLUSTER_COLOR, "fill-opacity": fadeIn(SUBTILE_MIN_ZOOM, 0.4), "fill-antialias": false },
    },
    {
      id: "subtile-grid-line",
      type: "line",
      source: SOURCES.subtileGrid,
      minzoom: SUBTILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": fadeIn(SUBTILE_GRID_MIN_ZOOM, 0.35), "line-width": 0.5 },
    },
    {
      id: "tile-grid-line",
      type: "line",
      source: SOURCES.tileGrid,
      minzoom: TILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": fadeIn(TILE_GRID_MIN_ZOOM, 0.6), "line-width": 1 },
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
  // The fills are rectangles along the axes: without antialiasing, the edges
  // shared by two of them leave no seam.
  for (const layer of layers) map.addLayer(layer, beforeId);
}

/** Points the vector tiles to the current version and updates the squares; false when the layers are not added yet. */
export function setTileData(map: MapLibreMap, data: TileData): boolean {
  const source = map.getSource<VectorTileSource>(VECTOR_SOURCE);
  if (!source || !data.version) return false;
  const url = tilesUrl(data.version);
  if (source.tiles[0] !== url) source.setTiles([url]);
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

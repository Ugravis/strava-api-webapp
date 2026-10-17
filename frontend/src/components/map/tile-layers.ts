import type { FeatureCollection, LineString, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  type ExploredTiles,
  gridCollection,
  maxClusterCollection,
  maxSquareCollection,
  SUBTILE_ZOOM,
  subtilesCollection,
  TILE_ZOOM,
  tilesCollection,
  type TileZoom,
} from "@/lib/tiles/tile-geometry";
import { CLUSTER_COLOR, GRID_COLOR, SQUARE_COLOR, TILE_COLOR } from "./map-style";

/** Which levels of tiles the map shows, if any. */
export type TileMode = "none" | "tiles" | "subtiles" | "both";

const SOURCES = {
  tiles: "visited-tiles",
  subtiles: "visited-subtiles",
  tileCluster: "tile-max-cluster",
  subtileCluster: "subtile-max-cluster",
  tileSquare: "tile-max-square",
  subtileSquare: "subtile-max-square",
  tileGrid: "tile-grid",
  subtileGrid: "subtile-grid",
} as const;

/** The grids only make sense once their cells are a few pixels wide. */
const TILE_GRID_MIN_ZOOM = 9;
const SUBTILE_GRID_MIN_ZOOM = 12;
/** In the combined view, the small tiles take over the large ones from this zoom. */
export const COMBINED_SUBTILE_MIN_ZOOM = 13;

const LEVEL_LAYERS = {
  tiles: ["visited-tiles-fill", "tile-max-cluster-fill", "visited-tiles-outline", "tile-max-square-line"],
  subtiles: ["visited-subtiles-fill", "subtile-max-cluster-fill", "subtile-grid-line", "subtile-max-square-line"],
} as const;
const ALL_LAYERS = [...LEVEL_LAYERS.tiles, ...LEVEL_LAYERS.subtiles, "tile-grid-line"];

/** Layers whose fill shows a visited tile: they react to the pointer. */
export const CLICKABLE_LAYERS = ["visited-tiles-fill", "visited-subtiles-fill"];

const VISIBLE_LAYERS: Record<TileMode, string[]> = {
  none: [],
  tiles: [...LEVEL_LAYERS.tiles, "tile-grid-line"],
  subtiles: [...LEVEL_LAYERS.subtiles, "tile-grid-line"],
  both: [...ALL_LAYERS],
};

/** Large tiles fade under the small ones when both levels are shown. */
const TILE_FILL_OPACITY = { single: 0.22, both: 0.12 };

export interface TileData {
  tiles: FeatureCollection<Polygon>;
  subtiles: FeatureCollection<Polygon>;
  tileCluster: FeatureCollection<Polygon>;
  subtileCluster: FeatureCollection<Polygon>;
  tileSquare: FeatureCollection<Polygon>;
  subtileSquare: FeatureCollection<Polygon>;
}

const EMPTY: FeatureCollection<never> = { type: "FeatureCollection", features: [] };
const EMPTY_LINES: FeatureCollection<LineString> = EMPTY;

export function tileData(explored: ExploredTiles | null): TileData {
  if (!explored) {
    return {
      tiles: EMPTY,
      subtiles: EMPTY,
      tileCluster: EMPTY,
      subtileCluster: EMPTY,
      tileSquare: EMPTY,
      subtileSquare: EMPTY,
    };
  }
  return {
    tiles: tilesCollection(explored.cells),
    subtiles: subtilesCollection(explored.cells),
    tileCluster: maxClusterCollection(explored.tiles, TILE_ZOOM),
    subtileCluster: maxClusterCollection(explored.subtiles, SUBTILE_ZOOM),
    tileSquare: maxSquareCollection(explored.tiles, TILE_ZOOM),
    subtileSquare: maxSquareCollection(explored.subtiles, SUBTILE_ZOOM),
  };
}

/** Level of the tile under the pointer, or null when no tile is shown. */
export function clickedZoom(mode: TileMode, mapZoom: number): TileZoom | null {
  switch (mode) {
    case "none":
      return null;
    case "tiles":
      return TILE_ZOOM;
    case "subtiles":
      return SUBTILE_ZOOM;
    case "both":
      return mapZoom >= COMBINED_SUBTILE_MIN_ZOOM ? SUBTILE_ZOOM : TILE_ZOOM;
  }
}

/** Adds the visited tiles, their achievements and the grids below `beforeId`, hidden until a mode is set. */
export function addTileLayers(map: MapLibreMap, data: TileData, beforeId: string | undefined): void {
  if (map.getSource(SOURCES.tiles)) return;
  for (const key of Object.keys(data) as (keyof TileData)[]) {
    map.addSource(SOURCES[key], { type: "geojson", data: data[key] });
  }
  map.addSource(SOURCES.tileGrid, { type: "geojson", data: EMPTY_LINES });
  map.addSource(SOURCES.subtileGrid, { type: "geojson", data: EMPTY_LINES });
  const layout = { visibility: "none" } as const;
  // Bottom to top: fills, then grids, then the outlines of the squares.
  const layers: Parameters<MapLibreMap["addLayer"]>[0][] = [
    {
      id: "visited-tiles-fill",
      type: "fill",
      source: SOURCES.tiles,
      layout,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": TILE_FILL_OPACITY.single },
    },
    {
      id: "tile-max-cluster-fill",
      type: "fill",
      source: SOURCES.tileCluster,
      layout,
      paint: { "fill-color": CLUSTER_COLOR, "fill-opacity": 0.3 },
    },
    {
      id: "visited-tiles-outline",
      type: "line",
      source: SOURCES.tiles,
      layout,
      paint: { "line-color": TILE_COLOR, "line-opacity": 0.6, "line-width": 1 },
    },
    {
      id: "visited-subtiles-fill",
      type: "fill",
      source: SOURCES.subtiles,
      layout,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": 0.35 },
    },
    {
      id: "subtile-max-cluster-fill",
      type: "fill",
      source: SOURCES.subtileCluster,
      layout,
      paint: { "fill-color": CLUSTER_COLOR, "fill-opacity": 0.4 },
    },
    {
      id: "subtile-grid-line",
      type: "line",
      source: SOURCES.subtileGrid,
      minzoom: SUBTILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": 0.35, "line-width": 0.5 },
    },
    {
      id: "tile-grid-line",
      type: "line",
      source: SOURCES.tileGrid,
      minzoom: TILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": GRID_COLOR, "line-opacity": 0.6, "line-width": 1 },
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

export function setTileData(map: MapLibreMap, data: TileData): void {
  for (const key of Object.keys(data) as (keyof TileData)[]) {
    map.getSource<GeoJSONSource>(SOURCES[key])?.setData(data[key]);
  }
}

export function setTileMode(map: MapLibreMap, mode: TileMode): void {
  const visible = new Set(VISIBLE_LAYERS[mode]);
  for (const id of ALL_LAYERS) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible.has(id) ? "visible" : "none");
    }
  }
  if (map.getLayer("visited-tiles-fill")) {
    map.setPaintProperty(
      "visited-tiles-fill",
      "fill-opacity",
      mode === "both" ? TILE_FILL_OPACITY.both : TILE_FILL_OPACITY.single,
    );
  }
  updateGrids(map, mode);
}

/** Draws the grids of the visible area, which change as the map moves. */
export function updateGrids(map: MapLibreMap, mode: TileMode): void {
  const bounds = map.getBounds();
  const area = { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() };
  const zoom = map.getZoom();
  const tileGrid = mode !== "none" && zoom >= TILE_GRID_MIN_ZOOM ? gridCollection(area, TILE_ZOOM) : EMPTY_LINES;
  const subtileGrid =
    (mode === "subtiles" || mode === "both") && zoom >= SUBTILE_GRID_MIN_ZOOM
      ? gridCollection(area, SUBTILE_ZOOM)
      : EMPTY_LINES;
  map.getSource<GeoJSONSource>(SOURCES.tileGrid)?.setData(tileGrid);
  map.getSource<GeoJSONSource>(SOURCES.subtileGrid)?.setData(subtileGrid);
}

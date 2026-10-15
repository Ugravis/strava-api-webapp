import type { FeatureCollection, LineString, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import {
  gridCollection,
  SUBTILE_ZOOM,
  subtilesCollection,
  TILE_ZOOM,
  type TileCell,
  tilesCollection,
} from "@/lib/tiles/tile-geometry";
import { GRID_COLOR, TILE_COLOR } from "./map-style";

/** Which level of tiles the map shows, if any. */
export type TileMode = "none" | "tiles" | "subtiles";

const SOURCES = {
  tiles: "visited-tiles",
  subtiles: "visited-subtiles",
  tileGrid: "tile-grid",
  subtileGrid: "subtile-grid",
} as const;

/** The grids only make sense once their cells are a few pixels wide. */
const TILE_GRID_MIN_ZOOM = 9;
const SUBTILE_GRID_MIN_ZOOM = 12;

const LAYERS: Record<Exclude<TileMode, "none">, string[]> = {
  tiles: ["visited-tiles-fill", "visited-tiles-outline", "tile-grid-line"],
  subtiles: ["visited-subtiles-fill", "subtile-grid-line", "tile-grid-line"],
};

export interface TileData {
  tiles: FeatureCollection<Polygon>;
  subtiles: FeatureCollection<Polygon>;
}

const EMPTY: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };

export function tileData(cells: TileCell[]): TileData {
  return { tiles: tilesCollection(cells), subtiles: subtilesCollection(cells) };
}

/** Adds the visited tiles and the grids below `beforeId`, hidden until a mode is set. */
export function addTileLayers(map: MapLibreMap, data: TileData, beforeId: string | undefined): void {
  if (map.getSource(SOURCES.tiles)) return;
  map.addSource(SOURCES.tiles, { type: "geojson", data: data.tiles });
  map.addSource(SOURCES.subtiles, { type: "geojson", data: data.subtiles });
  map.addSource(SOURCES.tileGrid, { type: "geojson", data: EMPTY });
  map.addSource(SOURCES.subtileGrid, { type: "geojson", data: EMPTY });
  const hidden = { visibility: "none" } as const;
  map.addLayer(
    {
      id: "visited-tiles-fill",
      type: "fill",
      source: SOURCES.tiles,
      layout: hidden,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": 0.22 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "visited-tiles-outline",
      type: "line",
      source: SOURCES.tiles,
      layout: hidden,
      paint: { "line-color": TILE_COLOR, "line-opacity": 0.6, "line-width": 1 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "visited-subtiles-fill",
      type: "fill",
      source: SOURCES.subtiles,
      layout: hidden,
      paint: { "fill-color": TILE_COLOR, "fill-opacity": 0.35 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "subtile-grid-line",
      type: "line",
      source: SOURCES.subtileGrid,
      minzoom: SUBTILE_GRID_MIN_ZOOM,
      layout: hidden,
      paint: { "line-color": GRID_COLOR, "line-opacity": 0.35, "line-width": 0.5 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "tile-grid-line",
      type: "line",
      source: SOURCES.tileGrid,
      minzoom: TILE_GRID_MIN_ZOOM,
      layout: hidden,
      paint: { "line-color": GRID_COLOR, "line-opacity": 0.6, "line-width": 1 },
    },
    beforeId,
  );
}

export function setTileData(map: MapLibreMap, data: TileData): void {
  map.getSource<GeoJSONSource>(SOURCES.tiles)?.setData(data.tiles);
  map.getSource<GeoJSONSource>(SOURCES.subtiles)?.setData(data.subtiles);
}

export function setTileMode(map: MapLibreMap, mode: TileMode): void {
  const visible = new Set(mode === "none" ? [] : LAYERS[mode]);
  for (const id of new Set([...LAYERS.tiles, ...LAYERS.subtiles])) {
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
  const tileGrid = mode !== "none" && zoom >= TILE_GRID_MIN_ZOOM ? gridCollection(area, TILE_ZOOM) : EMPTY;
  const subtileGrid =
    mode === "subtiles" && zoom >= SUBTILE_GRID_MIN_ZOOM ? gridCollection(area, SUBTILE_ZOOM) : EMPTY;
  map.getSource<GeoJSONSource>(SOURCES.tileGrid)?.setData(tileGrid);
  map.getSource<GeoJSONSource>(SOURCES.subtileGrid)?.setData(subtileGrid);
}

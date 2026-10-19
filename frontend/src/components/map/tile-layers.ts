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
import { belowHistory } from "./history-layer";
import { FADE_ZOOMS, fadeIn, type MapPalette } from "./map-style";

/** Which levels of tiles the map shows: none while the tiles module is hidden, the large tiles, or both levels. */
export type TileMode = "none" | "tiles" | "both";

/**
 * Tiles of the user, served as vector tiles by the backend. The browser
 * revalidates each one from its entity tag: when the tiles change, only the
 * map tiles they cover are downloaded again.
 */
const VECTOR_SOURCE = "user-tiles";
/**
 * Small tiles of the user, served as images: their size stays bounded
 * whatever the density of the tiles, down to the zoom of a whole country.
 */
const RASTER_SOURCE = "user-subtiles";
/** The backend serves the tiles down to this zoom; the map stretches them beyond. */
const TILES_MAX_ZOOM = 12;
/** Layers of the vector tiles: merged areas, and the small tiles at the deepest zoom, to pick them. */
const SOURCE_LAYERS = {
  tiles: "tiles",
  tilesOutline: "tiles_outline",
  tileCluster: "tile_cluster",
  tileClusters: "tile_clusters",
  subtiles: "subtiles",
} as const;

const SOURCES = {
  tileSquare: "tile-max-square",
  subtileSquare: "subtile-max-square",
  tileGrid: "tile-grid",
  subtileGrid: "subtile-grid",
} as const;

/** The grids only appear once their cells are large enough to be aimed at, about 64 pixels. */
const TILE_GRID_MIN_ZOOM = 11;
const SUBTILE_GRID_MIN_ZOOM = 14;
/**
 * The small tiles fade in from this zoom, once a large region fills the screen:
 * zoomed out further, the large tiles carry the map. The backend serves
 * their images from zoom 5.
 */
export const SUBTILE_MIN_ZOOM = 6;
/** The large tiles can be picked from this zoom, where they span about 8 pixels; below, nothing is picked. */
const TILE_CLICK_MIN_ZOOM = 8;
/** The small tiles can be picked from this zoom, where they span about 8 pixels; below, a click picks the large tile. */
const SUBTILE_CLICK_MIN_ZOOM = 12;
/**
 * The other clusters of large tiles fade in from this zoom, once a country
 * like France fills the screen. Those of small tiles are drawn in their
 * images from zoom 7, where a region does: the map cross-fades the images
 * of two zooms.
 */
const TILE_CLUSTERS_MIN_ZOOM = 5;
/** The outline of the visited area appears with the grid of the large tiles. */
const TILE_OUTLINE_MIN_ZOOM = TILE_GRID_MIN_ZOOM;
/** Distances from the pointer, in pixels, where a click looks for a tile: a finger is not precise. */
const CLICK_TOLERANCE_PX = [0, 6, 12];

const LEVEL_LAYERS = {
  tiles: ["visited-tiles-fill", "tile-clusters-fill", "tile-max-cluster-fill", "visited-tiles-outline", "tile-max-square-line"],
  subtiles: [
    "visited-subtiles-image",
    "visited-subtiles-fill",
    "subtile-grid-line",
    "subtile-max-square-line",
  ],
} as const;
const ALL_LAYERS = [...LEVEL_LAYERS.tiles, ...LEVEL_LAYERS.subtiles, "tile-grid-line"];

/** Lowest layer of the tiles: the visited countries go below it. */
export const TILE_FILL_LAYER_ID = "visited-tiles-fill";
/**
 * Fills drawn as the ground of the map, right over its bare land: they
 * hide none of the vegetation, water, buildings, roads and names.
 */
const GROUND_LAYERS = new Set([
  TILE_FILL_LAYER_ID,
  "tile-clusters-fill",
  "tile-max-cluster-fill",
  "visited-subtiles-image",
  "visited-subtiles-fill",
]);

/** Layers whose fill shows a visited tile, small tiles first: they react to the pointer. */
const CLICKABLE_LAYERS = ["visited-subtiles-fill", "visited-tiles-fill"];
const LAYER_ZOOMS: Record<string, TileZoom> = {
  "visited-subtiles-fill": SUBTILE_ZOOM,
  "visited-tiles-fill": TILE_ZOOM,
};

const VISIBLE_LAYERS: Record<TileMode, string[]> = {
  none: [],
  tiles: [...LEVEL_LAYERS.tiles, "tile-grid-line"],
  both: [...ALL_LAYERS],
};
/** While the map shows its state at a past date, only the grids of today's tiles stay. */
const PAST_LAYERS = new Set(["tile-grid-line", "subtile-grid-line"]);

/**
 * Zooms over which the large tiles take the color of the largest cluster:
 * zoomed in, the small tiles are the point, the large ones a quiet ground.
 */
const CLUSTER_MERGE_ZOOMS = [11, 12] as const;
/** Once the large tiles are pale, the small tiles lighten too: they stand out without weighing on the map. */
const MERGED_SUBTILE_OPACITY = 0.5;
/** Up to this zoom, the fills are at their strongest; they lighten until the merge. */
const STRONG_FILL_ZOOM = 7;

/**
 * Paint of the fill of the large tiles: stronger zoomed out, where the tiles
 * are the point of the map, lighter as the streets appear, then in the color
 * of the largest cluster once zoomed in.
 */
export function tilePaint(palette: MapPalette): { "fill-color": ExpressionSpecification; "fill-opacity": ExpressionSpecification } {
  const [from, to] = CLUSTER_MERGE_ZOOMS;
  return {
    "fill-color": ["interpolate", ["linear"], ["zoom"], from, palette.tile, to, palette.cluster],
    "fill-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      STRONG_FILL_ZOOM,
      Math.min(1, palette.tileOpacity * 2.5),
      from,
      palette.tileOpacity,
      to,
      1,
    ],
  };
}

/** Opacity of the images of the small tiles: fading in, then lighter once the large tiles are pale. */
export function subtileOpacity(): ExpressionSpecification {
  const [from, to] = CLUSTER_MERGE_ZOOMS;
  return ["interpolate", ["linear"], ["zoom"], SUBTILE_MIN_ZOOM, 0, SUBTILE_MIN_ZOOM + FADE_ZOOMS, 1, from, 1, to, MERGED_SUBTILE_OPACITY];
}

/**
 * Opacity of the fill of the other clusters: fading in from
 * `TILE_CLUSTERS_MIN_ZOOM`, stronger zoomed out, then merged into the large tiles.
 */
function otherClustersOpacity(opacity: number): ExpressionSpecification {
  const [from, to] = CLUSTER_MERGE_ZOOMS;
  const strong = Math.min(1, opacity * 2.5);
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    TILE_CLUSTERS_MIN_ZOOM,
    0,
    TILE_CLUSTERS_MIN_ZOOM + FADE_ZOOMS,
    strong,
    STRONG_FILL_ZOOM,
    strong,
    from,
    opacity,
    to,
    0,
  ];
}

/** What the map draws of the tiles: the tiles of a version, and the largest squares. */
export interface TileData {
  /** Null while loading. A new version reloads the tiles. */
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
export function rgba(color: string, alpha: number): string {
  return `${color.slice(1)}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

// Absolute: MapLibre fetches the tiles from its worker.
const tilesUrl = () => `${window.location.origin}/api/tiles/vector/{z}/{x}/{y}`;
/**
 * Images of the small tiles in the colors of `palette`, drawn in them with
 * their opacities; the server draws the other clusters from zoom 7.
 */
function imagesUrl(palette: MapPalette): string {
  const colors = [
    `color=${rgba(palette.subtile, palette.subtileOpacity)}`,
    `cluster=${rgba(palette.subtileCluster, palette.subtileClusterOpacity)}`,
    `clusters=${rgba(palette.otherSubtileClusters, palette.otherSubtileClustersOpacity)}`,
  ];
  return `${window.location.origin}/api/tiles/raster/{z}/{x}/{y}?${colors.join("&")}`;
}

/** Version of the tiles drawn by each map: a new one reloads its tiles. */
const drawnVersions = new WeakMap<MapLibreMap, string>();
/** Colors of the images of each map, those of its theme. */
const drawnPalettes = new WeakMap<MapLibreMap, MapPalette>();

/** Levels of the tile under the pointer, the most detailed first; none while the tiles are too small to aim at. */
export function clickableZooms(mode: TileMode, mapZoom: number): TileZoom[] {
  if (mode === "none" || mapZoom < TILE_CLICK_MIN_ZOOM) return [];
  return mode === "both" && mapZoom >= SUBTILE_CLICK_MIN_ZOOM ? [SUBTILE_ZOOM, TILE_ZOOM] : [TILE_ZOOM];
}

/**
 * The visited tile drawn at `point` or close to it: its level and the point
 * inside it, looked for at growing distances. Null outside the tiles.
 */
export function visitedTileNear(
  map: MapLibreMap,
  point: { x: number; y: number },
  zooms: TileZoom[],
): { zoom: TileZoom; point: { x: number; y: number } } | null {
  const layers = CLICKABLE_LAYERS.filter((id) => map.getLayer(id) && zooms.includes(LAYER_ZOOMS[id]));
  if (layers.length === 0) return null;
  for (const distance of CLICK_TOLERANCE_PX) {
    const candidates =
      distance === 0
        ? [point]
        : [-1, 0, 1].flatMap((dx) =>
            [-1, 0, 1]
              .filter((dy) => dx !== 0 || dy !== 0)
              .map((dy) => ({ x: point.x + dx * distance, y: point.y + dy * distance })),
          );
    // The most detailed level first: a small tile rather than its large tile.
    for (const zoom of zooms) {
      for (const candidate of candidates) {
        const ids = layers.filter((id) => LAYER_ZOOMS[id] === zoom);
        if (ids.length > 0 && map.queryRenderedFeatures([candidate.x, candidate.y], { layers: ids }).length > 0) {
          return { zoom, point: candidate };
        }
      }
    }
  }
  return null;
}

/**
 * Adds the visited tiles as the ground of the map, and their outlines,
 * grids and squares below `beforeId`, hidden until a mode is set. Needs the version of the tiles: until then,
 * nothing is added.
 */
export function addTileLayers(
  map: MapLibreMap,
  data: TileData,
  palette: MapPalette,
  beforeId: string | undefined,
): void {
  if (!data.version || map.getSource(VECTOR_SOURCE)) return;
  drawnVersions.set(map, data.version);
  drawnPalettes.set(map, palette);
  map.addSource(VECTOR_SOURCE, { type: "vector", tiles: [tilesUrl()], maxzoom: TILES_MAX_ZOOM });
  // 512 pixels images over 256 pixels: sharp on high density screens.
  map.addSource(RASTER_SOURCE, {
    type: "raster",
    tiles: [imagesUrl(palette)],
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
      id: TILE_FILL_LAYER_ID,
      type: "fill",
      ...vector(SOURCE_LAYERS.tiles),
      layout,
      paint: { ...tilePaint(palette), "fill-antialias": false },
    },
    {
      id: "tile-clusters-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.tileClusters),
      minzoom: TILE_CLUSTERS_MIN_ZOOM,
      layout,
      paint: {
        "fill-color": palette.otherClusters,
        "fill-opacity": otherClustersOpacity(palette.otherClustersOpacity),
        "fill-antialias": false,
      },
    },
    {
      id: "tile-max-cluster-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.tileCluster),
      layout,
      // Opaque: its color stays the same at every zoom, whatever the large tiles below.
      paint: { "fill-color": palette.cluster, "fill-antialias": false },
    },
    {
      id: "visited-tiles-outline",
      type: "line",
      ...vector(SOURCE_LAYERS.tilesOutline),
      minzoom: TILE_OUTLINE_MIN_ZOOM,
      layout,
      // Opaque enough to reach a contrast of 3:1 with the land.
      paint: { "line-color": palette.tileOutline, "line-opacity": fadeIn(TILE_OUTLINE_MIN_ZOOM, 0.8), "line-width": 1 },
    },
    {
      id: "visited-subtiles-image",
      type: "raster",
      source: RASTER_SOURCE,
      minzoom: SUBTILE_MIN_ZOOM,
      layout,
      // Nearest pixel: the edges of the small tiles stay sharp once stretched.
      paint: { "raster-opacity": subtileOpacity(), "raster-resampling": "nearest" },
    },
    {
      // Invisible: picks the small tile under the pointer, drawn by the images.
      id: "visited-subtiles-fill",
      type: "fill",
      ...vector(SOURCE_LAYERS.subtiles),
      minzoom: SUBTILE_CLICK_MIN_ZOOM,
      layout,
      paint: { "fill-color": palette.tile, "fill-opacity": 0 },
    },
    {
      id: "subtile-grid-line",
      type: "line",
      source: SOURCES.subtileGrid,
      minzoom: SUBTILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": palette.grid, "line-opacity": fadeIn(SUBTILE_GRID_MIN_ZOOM, 0.15), "line-width": 0.5 },
    },
    {
      id: "tile-grid-line",
      type: "line",
      source: SOURCES.tileGrid,
      minzoom: TILE_GRID_MIN_ZOOM,
      layout,
      paint: { "line-color": palette.grid, "line-opacity": fadeIn(TILE_GRID_MIN_ZOOM, 0.25), "line-width": 0.5 },
    },
    {
      id: "tile-max-square-line",
      type: "line",
      source: SOURCES.tileSquare,
      layout,
      paint: { "line-color": palette.square, "line-width": 2.5 },
    },
    {
      id: "subtile-max-square-line",
      type: "line",
      source: SOURCES.subtileSquare,
      layout,
      paint: { "line-color": palette.square, "line-width": 2 },
    },
  ];
  const groundId = belowHistory(map);
  for (const layer of layers) map.addLayer(layer, GROUND_LAYERS.has(layer.id) ? groundId : beforeId);
}

/** Reloads the tiles of a new version and updates the squares; false when the layers are not added yet. */
export function setTileData(map: MapLibreMap, data: TileData): boolean {
  const source = map.getSource<VectorTileSource>(VECTOR_SOURCE);
  if (!source || !data.version) return false;
  if (drawnVersions.get(map) !== data.version) {
    drawnVersions.set(map, data.version);
    // Same addresses: the tiles are requested again and the browser
    // revalidates them, only those whose tiles changed are downloaded.
    source.setTiles([tilesUrl()]);
    const palette = drawnPalettes.get(map);
    if (palette) map.getSource<RasterTileSource>(RASTER_SOURCE)?.setTiles([imagesUrl(palette)]);
  }
  map.getSource<GeoJSONSource>(SOURCES.tileSquare)?.setData(data.tileSquare);
  map.getSource<GeoJSONSource>(SOURCES.subtileSquare)?.setData(data.subtileSquare);
  return true;
}

/** Shows the levels of `mode`; only their grids while the map shows a past state (`past`). */
export function setTileMode(map: MapLibreMap, mode: TileMode, past = false): void {
  const visible = new Set(VISIBLE_LAYERS[mode].filter((id) => !past || PAST_LAYERS.has(id)));
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

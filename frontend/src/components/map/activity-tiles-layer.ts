import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, LayerSpecification, Map as MapLibreMap } from "maplibre-gl";
import { SUBTILE_ZOOM, TILE_ZOOM, tilesCollection } from "@/lib/tiles/tile-geometry";
import { firstGroundLayerId, type MapPalette } from "./map-style";

const SOURCES = { tiles: "activity-tiles", subtiles: "activity-subtiles" } as const;

/**
 * Zoomed out, a large tile spans less than a pixel and would vanish: like
 * the tiles of the user served by the backend, the large tiles are grouped
 * by ancestor, at least two pixels wide. Each grouping level is drawn below
 * the zoom where its cells span two pixels, `level - 8`.
 */
const GROUPING_LEVELS = [9, 10, 11, 12, 13] as const;
const PIXELS_LEVELS = 8;
/** The small tiles appear where they span two pixels. */
const SUBTILE_MIN_ZOOM = SUBTILE_ZOOM - PIXELS_LEVELS;

/** Lowest layer of the activity: the tiles of the user, added later, go below it. */
export const ACTIVITY_GROUND_LAYER_ID = "activity-tiles-fill-9";

/** Where the ground layers of the user go: below the activity shown, whenever they are added. */
export function belowActivityTiles(map: MapLibreMap): string | undefined {
  return map.getLayer(ACTIVITY_GROUND_LAYER_ID) ? ACTIVITY_GROUND_LAYER_ID : firstGroundLayerId(map);
}

/** Tiles of the activity shown in the panel: large tiles with their groupings, and small tiles. */
export interface ActivityTileData {
  tiles: FeatureCollection<Polygon>;
  subtiles: FeatureCollection<Polygon>;
}

const EMPTY: ActivityTileData = {
  tiles: { type: "FeatureCollection", features: [] },
  subtiles: { type: "FeatureCollection", features: [] },
};

/** The ancestors at `level` of large tiles, once each. */
function ancestors(tiles: [number, number][], level: number): [number, number][] {
  const shift = TILE_ZOOM - level;
  const seen = new Map<string, [number, number]>();
  for (const [x, y] of tiles) {
    const cell: [number, number] = [x >> shift, y >> shift];
    seen.set(`${cell[0]}/${cell[1]}`, cell);
  }
  return [...seen.values()];
}

/** Polygons of the large tiles at their zoom and of their groupings, tagged with their `level`. */
export function activityTileData(tiles: [number, number][], subtiles: [number, number][]): ActivityTileData {
  if (tiles.length === 0 && subtiles.length === 0) return EMPTY;
  const features: Feature<Polygon>[] = [
    ...GROUPING_LEVELS.flatMap((level) => tilesCollection(level, ancestors(tiles, level), { level }).features),
    ...tilesCollection(TILE_ZOOM, tiles, { level: TILE_ZOOM }).features,
  ];
  return {
    tiles: { type: "FeatureCollection", features },
    subtiles: tilesCollection(SUBTILE_ZOOM, subtiles),
  };
}

export const NO_ACTIVITY_TILES = EMPTY;

/** Zooms where the cells of `level` are drawn: from where they span two pixels to where the next level does. */
function levelZooms(level: number): { minzoom?: number; maxzoom?: number } {
  const first = level === GROUPING_LEVELS[0];
  return {
    ...(first ? {} : { minzoom: level - PIXELS_LEVELS }),
    ...(level === TILE_ZOOM ? {} : { maxzoom: level - PIXELS_LEVELS + 1 }),
  };
}

/**
 * Adds the tiles of the activity shown as the ground of the map, over the
 * tiles of the user and below the roads, water and names: opaque, they
 * replace the other tiles where they lie, as if they were the only ones.
 */
export function addActivityTileLayers(map: MapLibreMap, data: ActivityTileData, palette: MapPalette): void {
  if (map.getSource(SOURCES.tiles)) return;
  // Without simplification, no tile is dropped zoomed out.
  map.addSource(SOURCES.tiles, { type: "geojson", data: data.tiles, tolerance: 0 });
  map.addSource(SOURCES.subtiles, { type: "geojson", data: data.subtiles, tolerance: 0 });
  // Without antialiasing, the edges shared by two tiles leave no seam.
  const layers: LayerSpecification[] = [
    ...[...GROUPING_LEVELS, TILE_ZOOM].map(
      (level): LayerSpecification => ({
        id: level === GROUPING_LEVELS[0] ? ACTIVITY_GROUND_LAYER_ID : `activity-tiles-fill-${level}`,
        type: "fill",
        source: SOURCES.tiles,
        filter: ["==", ["get", "level"], level],
        ...levelZooms(level),
        paint: { "fill-color": palette.activityTile, "fill-antialias": false },
      }),
    ),
    {
      id: "activity-subtiles-fill",
      type: "fill",
      source: SOURCES.subtiles,
      minzoom: SUBTILE_MIN_ZOOM,
      paint: { "fill-color": palette.activitySubtile, "fill-antialias": false },
    },
  ];
  const groundId = firstGroundLayerId(map);
  for (const layer of layers) map.addLayer(layer, groundId);
}

/** Draws the tiles of another activity, or none; ignored until the layers are added. */
export function setActivityTiles(map: MapLibreMap, data: ActivityTileData): void {
  map.getSource<GeoJSONSource>(SOURCES.tiles)?.setData(data.tiles);
  map.getSource<GeoJSONSource>(SOURCES.subtiles)?.setData(data.subtiles);
}

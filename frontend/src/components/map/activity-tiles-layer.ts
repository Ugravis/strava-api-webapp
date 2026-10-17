import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { ActivityTiles } from "@/lib/api/types";
import { SUBTILE_ZOOM, TILE_ZOOM, tilesCollection } from "@/lib/tiles/tile-geometry";
import type { MapPalette } from "./map-style";

const SOURCES = { tiles: "activity-tiles", subtiles: "activity-subtiles" } as const;

/** Tiles of the activity shown in the panel, as polygons of each level. */
export interface ActivityTileData {
  tiles: FeatureCollection<Polygon>;
  subtiles: FeatureCollection<Polygon>;
}

export function activityTileData(tiles: ActivityTiles | null): ActivityTileData {
  return {
    tiles: tilesCollection(TILE_ZOOM, tiles?.tiles ?? []),
    subtiles: tilesCollection(SUBTILE_ZOOM, tiles?.subtiles ?? []),
  };
}

/**
 * Adds the tiles of the activity shown below `beforeId`, typically the
 * outline of the highlighted tile: over the tiles of the user, in pink.
 */
export function addActivityTileLayers(
  map: MapLibreMap,
  data: ActivityTileData,
  palette: MapPalette,
  beforeId: string | undefined,
): void {
  if (map.getSource(SOURCES.tiles)) return;
  map.addSource(SOURCES.tiles, { type: "geojson", data: data.tiles });
  map.addSource(SOURCES.subtiles, { type: "geojson", data: data.subtiles });
  // Without antialiasing, the edges shared by two tiles leave no seam.
  map.addLayer(
    {
      id: "activity-tiles-fill",
      type: "fill",
      source: SOURCES.tiles,
      paint: { "fill-color": palette.activityTile, "fill-opacity": palette.activityTileOpacity, "fill-antialias": false },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "activity-subtiles-fill",
      type: "fill",
      source: SOURCES.subtiles,
      paint: {
        "fill-color": palette.activitySubtile,
        "fill-opacity": palette.activitySubtileOpacity,
        "fill-antialias": false,
      },
    },
    beforeId,
  );
}

/** Draws the tiles of another activity, or none; ignored until the layers are added. */
export function setActivityTiles(map: MapLibreMap, data: ActivityTileData): void {
  map.getSource<GeoJSONSource>(SOURCES.tiles)?.setData(data.tiles);
  map.getSource<GeoJSONSource>(SOURCES.subtiles)?.setData(data.subtiles);
}

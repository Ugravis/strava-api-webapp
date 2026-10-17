import type { TileMode } from "./tile-layers";

/** Optional layers of the map, over the large tiles which are always drawn. */
export interface MapLayers {
  tracks: boolean;
  subtiles: boolean;
}

export const ALL_MAP_LAYERS: MapLayers = { tracks: true, subtiles: true };

/** Levels of tiles drawn for the layers chosen. */
export function tileModeOf({ subtiles }: MapLayers): TileMode {
  return subtiles ? "both" : "tiles";
}

import type { TileMode } from "./tile-layers";

/** Optional layers of the map, over the large tiles which are always drawn. */
export interface MapLayers {
  tracks: boolean;
  subtiles: boolean;
  /** The train stations and the railway between the visited ones. */
  stations: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayers = { tracks: true, subtiles: true, stations: false };

/** Levels of tiles drawn for the layers chosen. */
export function tileModeOf({ subtiles }: MapLayers): TileMode {
  return subtiles ? "both" : "tiles";
}

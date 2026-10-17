import type { TileView } from "./tile-layers";

/** Optional layers of the map, over the large tiles which are always drawn. */
export interface MapLayers {
  tracks: boolean;
  subtiles: boolean;
  /** Clusters other than the largest, per level. */
  tileClusters: boolean;
  subtileClusters: boolean;
}

export const ALL_MAP_LAYERS: MapLayers = { tracks: true, subtiles: true, tileClusters: true, subtileClusters: true };

/** What the map draws of the tiles for the layers chosen. */
export function tileViewOf({ subtiles, tileClusters, subtileClusters }: MapLayers): TileView {
  return { mode: subtiles ? "both" : "tiles", tileClusters, subtileClusters };
}

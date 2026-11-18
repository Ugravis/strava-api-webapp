import type { Map as MapLibreMap } from "maplibre-gl";
import { firstGroundLayerId } from "./map-style";

/*
 * Ids shared by the layers of the map, which place themselves around each
 * other: kept here so that each layer finds the others without importing them.
 */

/** Lowest layer of the activity: the tiles of the user, added later, go below it. */
export const ACTIVITY_GROUND_LAYER_ID = "activity-tiles-fill-9";
/** Lowest layer of the tiles: the visited countries go below it. */
export const TILE_FILL_LAYER_ID = "visited-tiles-fill";
/** The veil of the sector: the layers drawn over the map go below it. */
export const SECTOR_VEIL_LAYER_ID = "sector-outside-fill";
/** Source of the trains, drawn by the stations layer. */
export const TRAINS_SOURCE = "station-trains";
/** Zoom from which the trains show, as plain blocks. */
export const TRAINS_MIN_ZOOM = 9;

/** Where the ground layers of the user go: below the activity shown, whenever they are added. */
export function belowActivityTiles(map: MapLibreMap): string | undefined {
  return map.getLayer(ACTIVITY_GROUND_LAYER_ID) ? ACTIVITY_GROUND_LAYER_ID : firstGroundLayerId(map);
}

import type { ActivityTiles } from "@kilotrace/ui/lib/api/types";

/** What the map draws of the activity shown. Not kept: each activity opens with the defaults. */
export interface ActivityView {
  /** Only the tiles the activity gained, once its gains are known. */
  gainedOnly: boolean;
  tiles: boolean;
  subtiles: boolean;
  track: boolean;
  /** The stations the activity reached first and the railway they unlocked, in pink. */
  stations: boolean;
}

/** The gained tiles, the large tiles, the track and the stations gained; the small tiles only when the map shows them. */
export function defaultActivityView(subtilesShown: boolean): ActivityView {
  return { gainedOnly: true, tiles: true, subtiles: subtilesShown, track: true, stations: true };
}

/** Whether the activity gained any tile, once its gains are known. */
export function hasGains({ gains }: ActivityTiles): boolean {
  return gains !== null && gains.tiles.gained.length + gains.subtiles.gained.length > 0;
}

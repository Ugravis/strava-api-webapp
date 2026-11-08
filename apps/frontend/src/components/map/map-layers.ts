import type { TileMode } from "./tile-layers";

/** Modules of the map, each with its figures in the band and its layers on the map. */
export const MAP_MODULES = ["tiles", "stations"] as const;
export type MapModule = (typeof MAP_MODULES)[number];

export const DEFAULT_MAP_MODULE: MapModule = "tiles";

/** What the map draws: the modules shown, the optional layers of the tiles module, and the dimming of the stations module. */
export interface MapLayers {
  /** The tiles module: the large tiles, and the small tiles and the tracks when shown. */
  tiles: boolean;
  tracks: boolean;
  subtiles: boolean;
  /** The stations module: the train stations and the railway between the visited ones. */
  stations: boolean;
  /** The base map and the tiles dimmed below the stations, while they are shown and selected. */
  dimmed: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayers = { tiles: true, tracks: true, subtiles: true, stations: true, dimmed: false };

/** The layers once `module` is opened from the navigation: shown, the dimming left as it was. */
export function withModuleOpened(layers: MapLayers, module: MapModule): MapLayers {
  return { ...layers, [module]: true };
}

/** Levels of tiles drawn for the layers chosen. */
export function tileModeOf({ tiles, subtiles }: MapLayers): TileMode {
  return !tiles ? "none" : subtiles ? "both" : "tiles";
}

/** Whether the tracks are drawn: an optional layer of the tiles module. */
export const tracksShown = ({ tiles, tracks }: MapLayers): boolean => tiles && tracks;

/** Whether the map is dimmed: an option of the stations module, applied while it is shown and selected. */
export const mapDimmed = ({ stations, dimmed }: MapLayers, module: MapModule): boolean =>
  module === "stations" && stations && dimmed;

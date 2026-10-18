import { SUBTILE_ZOOM, TILE_ZOOM, type TileZoom } from "@/lib/tiles/tile-geometry";
import { sameTile, type TileRef } from "./tile-highlight";

/**
 * A place picked on the map: the large tile and, when known, the small tile
 * under the pointer, and the level shown, `zoom` of one of them.
 */
export interface TilePick {
  tile: TileRef;
  /** Unknown when only the large tile was named, by the address of the page. */
  subtile: TileRef | null;
  zoom: TileZoom;
}

/** What the side panel shows: a tile picked on the map, an activity opened from it, or a train station. */
export type PanelEntry =
  | ({ kind: "tile" } & TilePick)
  | { kind: "activity"; activityId: string }
  | { kind: "station"; stationId: number };

/** The tile of the level shown. */
export function shownTile(pick: TilePick): TileRef {
  return pick.zoom === SUBTILE_ZOOM && pick.subtile ? pick.subtile : pick.tile;
}

export function sameEntry(a: PanelEntry, b: PanelEntry): boolean {
  switch (a.kind) {
    case "tile":
      return b.kind === "tile" && sameTile(shownTile(a), shownTile(b));
    case "activity":
      return b.kind === "activity" && a.activityId === b.activityId;
    case "station":
      return b.kind === "station" && a.stationId === b.stationId;
  }
}

/** `zoom/x/y` of a tile. */
const tilePath = ({ zoom, x, y }: TileRef) => `${zoom}/${x}/${y}`;

/** Identifies an entry, e.g. as the key of its content. */
export function entryKey(entry: PanelEntry): string {
  switch (entry.kind) {
    case "tile":
      return tilePath(shownTile(entry));
    case "activity":
      return entry.activityId;
    case "station":
      return `station/${entry.stationId}`;
  }
}

/** The pick of a tile named alone: a small tile with its large tile, a large tile without small tile. */
export function pickOf(tile: TileRef): TilePick {
  if (tile.zoom === TILE_ZOOM) return { tile, subtile: null, zoom: TILE_ZOOM };
  const shift = SUBTILE_ZOOM - TILE_ZOOM;
  return { tile: { zoom: TILE_ZOOM, x: tile.x >> shift, y: tile.y >> shift }, subtile: tile, zoom: SUBTILE_ZOOM };
}

/** Search parameters of the entry shown: `?tile=zoom/x/y`, `?activity=id` or `?station=id`. */
const PARAMS = { tile: "tile", activity: "activity", station: "station" } as const;

const TILE_PARAM = /^(\d{2})\/(\d{1,6})\/(\d{1,6})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATION_ID = /^[1-9]\d{0,9}$/;

/** The tile of `?tile=zoom/x/y`; null when malformed or outside the world. */
function parseTile(value: string): TileRef | null {
  const match = TILE_PARAM.exec(value);
  if (!match) return null;
  const [level, x, y] = match.slice(1).map(Number);
  const zoom = level === TILE_ZOOM ? TILE_ZOOM : level === SUBTILE_ZOOM ? SUBTILE_ZOOM : null;
  if (zoom === null) return null;
  const size = 2 ** zoom;
  return x < size && y < size ? { zoom, x, y } : null;
}

/**
 * The entry given by the address of the page, the activity first, then the
 * station. `invalid` tells that a parameter was given but malformed: it is
 * then ignored.
 */
export function entryFromSearch(search: string): { entry: PanelEntry | null; invalid: boolean } {
  const params = new URLSearchParams(search);
  const activity = params.get(PARAMS.activity);
  const station = params.get(PARAMS.station);
  const tile = params.get(PARAMS.tile);
  const validActivity = activity !== null && UUID.test(activity);
  const validStation = station !== null && STATION_ID.test(station);
  const parsed = tile !== null ? parseTile(tile) : null;
  const invalid =
    (activity !== null && !validActivity) || (station !== null && !validStation) || (tile !== null && !parsed);
  if (validActivity) return { entry: { kind: "activity", activityId: activity.toLowerCase() }, invalid };
  if (validStation) return { entry: { kind: "station", stationId: Number(station) }, invalid };
  return { entry: parsed && { kind: "tile", ...pickOf(parsed) }, invalid };
}

/** The address of the page showing `entry`, or nothing, keeping its other parameters. */
export function searchWithEntry(search: string, entry: PanelEntry | null): string {
  const params = new URLSearchParams(search);
  for (const name of Object.values(PARAMS)) params.delete(name);
  if (entry?.kind === "tile") params.set(PARAMS.tile, tilePath(shownTile(entry)));
  if (entry?.kind === "activity") params.set(PARAMS.activity, entry.activityId);
  if (entry?.kind === "station") params.set(PARAMS.station, String(entry.stationId));
  return searchOf(params);
}

/** The search part of an address, `?` included, or nothing without parameters. */
export function searchOf(params: URLSearchParams): string {
  const query = params.toString();
  // The slashes of the tile stay readable.
  return query ? `?${query.replaceAll("%2F", "/")}` : "";
}

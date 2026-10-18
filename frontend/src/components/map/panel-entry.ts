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

/** What the side panel shows: a tile picked on the map, or an activity opened from it. */
export type PanelEntry = ({ kind: "tile" } & TilePick) | { kind: "activity"; activityId: string };

/** The tile of the level shown. */
export function shownTile(pick: TilePick): TileRef {
  return pick.zoom === SUBTILE_ZOOM && pick.subtile ? pick.subtile : pick.tile;
}

export function sameEntry(a: PanelEntry, b: PanelEntry): boolean {
  return a.kind === "tile"
    ? b.kind === "tile" && sameTile(shownTile(a), shownTile(b))
    : b.kind === "activity" && a.activityId === b.activityId;
}

/** `zoom/x/y` of a tile. */
const tilePath = ({ zoom, x, y }: TileRef) => `${zoom}/${x}/${y}`;

/** Identifies an entry, e.g. as the key of its content. */
export function entryKey(entry: PanelEntry): string {
  return entry.kind === "tile" ? tilePath(shownTile(entry)) : entry.activityId;
}

/** The pick of a tile named alone: a small tile with its large tile, a large tile without small tile. */
export function pickOf(tile: TileRef): TilePick {
  if (tile.zoom === TILE_ZOOM) return { tile, subtile: null, zoom: TILE_ZOOM };
  const shift = SUBTILE_ZOOM - TILE_ZOOM;
  return { tile: { zoom: TILE_ZOOM, x: tile.x >> shift, y: tile.y >> shift }, subtile: tile, zoom: SUBTILE_ZOOM };
}

/** Search parameters of the entry shown: `?tile=zoom/x/y` or `?activity=id`. */
const PARAMS = { tile: "tile", activity: "activity" } as const;

const TILE_PARAM = /^(\d{2})\/(\d{1,6})\/(\d{1,6})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 * The entry given by the address of the page, the activity first. `invalid`
 * tells that a parameter was given but malformed: it is then ignored.
 */
export function entryFromSearch(search: string): { entry: PanelEntry | null; invalid: boolean } {
  const params = new URLSearchParams(search);
  const activity = params.get(PARAMS.activity);
  const tile = params.get(PARAMS.tile);
  if (activity !== null && UUID.test(activity)) {
    return { entry: { kind: "activity", activityId: activity.toLowerCase() }, invalid: tile !== null && !parseTile(tile) };
  }
  const parsed = tile !== null ? parseTile(tile) : null;
  return {
    entry: parsed && { kind: "tile", ...pickOf(parsed) },
    invalid: activity !== null || (tile !== null && !parsed),
  };
}

/** The address of the page showing `entry`, or nothing, keeping its other parameters. */
export function searchWithEntry(search: string, entry: PanelEntry | null): string {
  const params = new URLSearchParams(search);
  params.delete(PARAMS.tile);
  params.delete(PARAMS.activity);
  if (entry?.kind === "tile") params.set(PARAMS.tile, tilePath(shownTile(entry)));
  if (entry?.kind === "activity") params.set(PARAMS.activity, entry.activityId);
  const query = params.toString();
  // The slashes of the tile stay readable.
  return query ? `?${query.replaceAll("%2F", "/")}` : "";
}

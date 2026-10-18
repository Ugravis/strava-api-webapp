import { SUBTILE_ZOOM, TILE_ZOOM } from "@/lib/tiles/tile-geometry";
import { sameTile, type TileRef } from "./tile-highlight";

/** What the side panel shows: a tile picked on the map, or an activity opened from it. */
export type PanelEntry = { kind: "tile"; tile: TileRef } | { kind: "activity"; activityId: string };

export function sameEntry(a: PanelEntry, b: PanelEntry): boolean {
  return a.kind === "tile"
    ? b.kind === "tile" && sameTile(a.tile, b.tile)
    : b.kind === "activity" && a.activityId === b.activityId;
}

/** Identifies an entry, e.g. as the key of its content. */
export function entryKey(entry: PanelEntry): string {
  return entry.kind === "tile" ? `${entry.tile.zoom}/${entry.tile.x}/${entry.tile.y}` : entry.activityId;
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
    entry: parsed && { kind: "tile", tile: parsed },
    invalid: activity !== null || (tile !== null && !parsed),
  };
}

/** The address of the page showing `entry`, or nothing, keeping its other parameters. */
export function searchWithEntry(search: string, entry: PanelEntry | null): string {
  const params = new URLSearchParams(search);
  params.delete(PARAMS.tile);
  params.delete(PARAMS.activity);
  if (entry?.kind === "tile") params.set(PARAMS.tile, entryKey(entry));
  if (entry?.kind === "activity") params.set(PARAMS.activity, entry.activityId);
  const query = params.toString();
  // The slashes of the tile stay readable.
  return query ? `?${query.replaceAll("%2F", "/")}` : "";
}

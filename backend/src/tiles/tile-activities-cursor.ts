/** Position in the activities of a tile: those started before it come next. */
export interface TileActivitiesCursor {
  startedAt: Date;
  id: string;
}

/** `<startedAt ISO 8601>_<activity id>`. */
export const TILE_ACTIVITIES_CURSOR =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function encodeTileActivitiesCursor(
  cursor: TileActivitiesCursor,
): string {
  return `${cursor.startedAt.toISOString()}_${cursor.id}`;
}

/** The cursor of `TILE_ACTIVITIES_CURSOR`, validated beforehand. */
export function decodeTileActivitiesCursor(
  value: string,
): TileActivitiesCursor {
  const [startedAt, id] = value.split('_');
  return { startedAt: new Date(startedAt), id };
}

import { SUBTILE_ZOOM, TILE_ZOOM, tilePosition } from '../tiles/tile-grid';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/** Small tile holding a point: its large tile and its bit in the mask, as in `TileSet`. */
export function placeTile(
  lon: number,
  lat: number,
): { x: number; y: number; bit: number } {
  const [px, py] = tilePosition([lat, lon], SUBTILE_ZOOM);
  const max = 2 ** SUBTILE_ZOOM - 1;
  const sx = Math.min(max, Math.max(0, Math.floor(px)));
  const sy = Math.min(max, Math.max(0, Math.floor(py)));
  return {
    x: Math.floor(sx / SUBTILES_PER_SIDE),
    y: Math.floor(sy / SUBTILES_PER_SIDE),
    bit:
      (sy % SUBTILES_PER_SIDE) * SUBTILES_PER_SIDE + (sx % SUBTILES_PER_SIDE),
  };
}

import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";

/** Large tiles: slippy-map tiles at zoom 14. */
export const TILE_ZOOM = 14;
/** Small tiles: zoom 17, 8 × 8 per large tile. */
export const SUBTILE_ZOOM = 17;
const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
// The project targets ES2017: no bigint literals.
const ZERO = BigInt(0);
const ONE = BigInt(1);

/** A large tile and its visited small tiles: bit `8 × row + column`. */
export interface TileCell {
  x: number;
  y: number;
  mask: bigint;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function parseCells(cells: [number, number, string][]): TileCell[] {
  return cells.map(([x, y, mask]) => ({ x, y, mask: BigInt(mask) }));
}

const lngOf = (x: number, zoom: number) => (x / 2 ** zoom) * 360 - 180;
const latOf = (y: number, zoom: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** zoom))) * 180) / Math.PI;
const xOf = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;
const yOf = (lat: number, zoom: number) => {
  const rad = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

function square(x: number, y: number, zoom: number): Feature<Polygon> {
  const west = lngOf(x, zoom);
  const east = lngOf(x + 1, zoom);
  const north = latOf(y, zoom);
  const south = latOf(y + 1, zoom);
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
          [west, north],
        ],
      ],
    },
  };
}

/** Visited large tiles. */
export function tilesCollection(cells: TileCell[]): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: cells.filter((cell) => cell.mask !== ZERO).map(({ x, y }) => square(x, y, TILE_ZOOM)),
  };
}

/** Visited small tiles. */
export function subtilesCollection(cells: TileCell[]): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];
  for (const { x, y, mask } of cells) {
    for (let bit = 0; bit < 64; bit++) {
      if (((mask >> BigInt(bit)) & ONE) === ONE) {
        features.push(
          square(
            x * SUBTILES_PER_SIDE + (bit % SUBTILES_PER_SIDE),
            y * SUBTILES_PER_SIDE + Math.floor(bit / SUBTILES_PER_SIDE),
            SUBTILE_ZOOM,
          ),
        );
      }
    }
  }
  return { type: "FeatureCollection", features };
}

/**
 * Tile boundaries at `zoom` within `bounds`, or nothing when they would be
 * too dense to read.
 */
export function gridCollection(bounds: Bounds, zoom: number, maxLines = 300): FeatureCollection<LineString> {
  const minX = Math.floor(xOf(bounds.west, zoom));
  const maxX = Math.ceil(xOf(bounds.east, zoom));
  const minY = Math.floor(yOf(bounds.north, zoom));
  const maxY = Math.ceil(yOf(bounds.south, zoom));
  if (maxX - minX + (maxY - minY) > maxLines) {
    return { type: "FeatureCollection", features: [] };
  }
  const line = (coordinates: [number, number][]): Feature<LineString> => ({
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  });
  const north = latOf(minY, zoom);
  const south = latOf(maxY, zoom);
  const west = lngOf(minX, zoom);
  const east = lngOf(maxX, zoom);
  const features: Feature<LineString>[] = [];
  for (let x = minX; x <= maxX; x++) {
    features.push(line([[lngOf(x, zoom), north], [lngOf(x, zoom), south]]));
  }
  for (let y = minY; y <= maxY; y++) {
    features.push(line([[west, latOf(y, zoom)], [east, latOf(y, zoom)]]));
  }
  return { type: "FeatureCollection", features };
}

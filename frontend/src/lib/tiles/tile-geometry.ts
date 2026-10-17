import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { TileSquare } from "@/lib/api/types";

/** Large tiles: slippy-map tiles at zoom 14. */
export const TILE_ZOOM = 14;
/** Small tiles: zoom 17, 8 × 8 per large tile. */
export const SUBTILE_ZOOM = 17;

/** Zoom of one of the two levels of tiles. */
export type TileZoom = typeof TILE_ZOOM | typeof SUBTILE_ZOOM;

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

const lngOf = (x: number, zoom: number) => (x / 2 ** zoom) * 360 - 180;
const latOf = (y: number, zoom: number) =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** zoom))) * 180) / Math.PI;
const xOf = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;
const yOf = (lat: number, zoom: number) => {
  const rad = (Math.max(-85.05, Math.min(85.05, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

/** The `size × size` tiles whose top-left one is `(x, y)`. */
function square(x: number, y: number, zoom: number, size = 1): Feature<Polygon> {
  const west = lngOf(x, zoom);
  const east = lngOf(x + size, zoom);
  const north = latOf(y, zoom);
  const south = latOf(y + size, zoom);
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

/** Largest square of a level, as one polygon. */
export function maxSquareCollection(maxSquare: TileSquare | null, zoom: TileZoom): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: maxSquare ? [square(maxSquare.x, maxSquare.y, zoom, maxSquare.size)] : [],
  };
}

/** One tile, as one polygon. */
export function tileCollection(zoom: TileZoom, x: number, y: number): FeatureCollection<Polygon> {
  return { type: "FeatureCollection", features: [square(x, y, zoom)] };
}

/** The tile of `zoom` holding the position `(lng, lat)`. */
export function tileAt(lng: number, lat: number, zoom: TileZoom): [number, number] {
  return [Math.floor(xOf(lng, zoom)), Math.floor(yOf(lat, zoom))];
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

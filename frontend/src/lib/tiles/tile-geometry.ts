import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { TileLevelAchievements, TilesResponse } from "@/lib/api/types";

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

/** Zoom of one of the two levels of tiles. */
export type TileZoom = typeof TILE_ZOOM | typeof SUBTILE_ZOOM;

/** The tiles crossed by the user and their achievements, per level. */
export interface ExploredTiles {
  cells: TileCell[];
  tiles: TileLevelAchievements;
  subtiles: TileLevelAchievements;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function parseTiles({ cells, tiles, subtiles }: TilesResponse): ExploredTiles {
  return { cells: cells.map(([x, y, mask]) => ({ x, y, mask: BigInt(mask) })), tiles, subtiles };
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

/** Largest square of a level, as one polygon. */
export function maxSquareCollection(achievements: TileLevelAchievements, zoom: TileZoom): FeatureCollection<Polygon> {
  const { maxSquare } = achievements;
  return {
    type: "FeatureCollection",
    features: maxSquare ? [square(maxSquare.x, maxSquare.y, zoom, maxSquare.size)] : [],
  };
}

/** Tiles of the largest cluster of a level. */
export function maxClusterCollection(achievements: TileLevelAchievements, zoom: TileZoom): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: achievements.maxCluster.map(([x, y]) => square(x, y, zoom)),
  };
}

/** The tile of `zoom` holding the position `(lng, lat)`. */
export function tileAt(lng: number, lat: number, zoom: TileZoom): [number, number] {
  return [Math.floor(xOf(lng, zoom)), Math.floor(yOf(lat, zoom))];
}

export function countSubtiles(mask: bigint): number {
  let count = 0;
  for (let rest = mask; rest !== ZERO; rest &= rest - ONE) count++;
  return count;
}

/** What the map knows about one tile, without asking the API. */
export interface TileSummary {
  visited: boolean;
  /** Small tiles explored inside a large tile; null for a small tile. */
  subtiles: number | null;
  /** Its four neighbors are visited too. */
  clustered: boolean;
  inMaxCluster: boolean;
  inMaxSquare: boolean;
}

/** Lookup of the explored tiles, built once per set of tiles. */
export class TileIndex {
  private readonly masks = new Map<string, bigint>();
  private readonly maxClusters: Record<TileZoom, Set<string>>;

  constructor(private readonly explored: ExploredTiles) {
    for (const { x, y, mask } of explored.cells) this.masks.set(`${x}/${y}`, mask);
    const keys = ({ maxCluster }: TileLevelAchievements) => new Set(maxCluster.map(([x, y]) => `${x}/${y}`));
    this.maxClusters = { [TILE_ZOOM]: keys(explored.tiles), [SUBTILE_ZOOM]: keys(explored.subtiles) };
  }

  isVisited(zoom: TileZoom, x: number, y: number): boolean {
    if (zoom === TILE_ZOOM) return (this.masks.get(`${x}/${y}`) ?? ZERO) !== ZERO;
    const mask = this.masks.get(`${Math.floor(x / SUBTILES_PER_SIDE)}/${Math.floor(y / SUBTILES_PER_SIDE)}`);
    const bit = (y % SUBTILES_PER_SIDE) * SUBTILES_PER_SIDE + (x % SUBTILES_PER_SIDE);
    return mask !== undefined && ((mask >> BigInt(bit)) & ONE) === ONE;
  }

  summary(zoom: TileZoom, x: number, y: number): TileSummary {
    const square = (zoom === TILE_ZOOM ? this.explored.tiles : this.explored.subtiles).maxSquare;
    return {
      visited: this.isVisited(zoom, x, y),
      subtiles: zoom === TILE_ZOOM ? countSubtiles(this.masks.get(`${x}/${y}`) ?? ZERO) : null,
      clustered: [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].every(([dx, dy]) => this.isVisited(zoom, x + dx, y + dy)) && this.isVisited(zoom, x, y),
      inMaxCluster: this.maxClusters[zoom].has(`${x}/${y}`),
      inMaxSquare:
        square !== null &&
        x >= square.x &&
        x < square.x + square.size &&
        y >= square.y &&
        y < square.y + square.size,
    };
  }
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

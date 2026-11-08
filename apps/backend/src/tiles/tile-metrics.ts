import { SUBTILE_ZOOM, TILE_ZOOM, type TileCell } from './tile-grid';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
/** Tile coordinates stay below 2^17: a pair fits in one safe integer. */
const KEY_BASE = 2 ** 18;

const keyOf = (x: number, y: number) => y * KEY_BASE + x;

/** Coordinates of a tile at the zoom of its level. */
export type TilePoint = [number, number];

/** Top-left tile and side of a square made of visited tiles. */
export interface TileSquare {
  x: number;
  y: number;
  size: number;
}

export interface LevelMetrics {
  visited: number;
  /** Largest square made of visited tiles; null when nothing is visited. */
  maxSquare: TileSquare | null;
  /** Largest group of connected cluster tiles. */
  maxCluster: TilePoint[];
  /** Cluster tiles: visited tiles whose four neighbors are visited too. */
  clusterTiles: TilePoint[];
}

export interface TileMetrics {
  /** Large tiles (zoom 14). */
  tiles: LevelMetrics;
  /** Small tiles (zoom 17). */
  subtiles: LevelMetrics;
}

/** Visited large tiles. */
export function tilePoints(cells: TileCell[]): TilePoint[] {
  return cells.filter((cell) => cell.mask !== 0n).map(({ x, y }) => [x, y]);
}

/** Visited small tiles. */
export function subtilePoints(cells: TileCell[]): TilePoint[] {
  const points: TilePoint[] = [];
  for (const { x, y, mask } of cells) {
    for (let bit = 0; bit < 64; bit++) {
      if ((mask >> BigInt(bit)) & 1n) {
        points.push([
          x * SUBTILES_PER_SIDE + (bit % SUBTILES_PER_SIDE),
          y * SUBTILES_PER_SIDE + Math.floor(bit / SUBTILES_PER_SIDE),
        ]);
      }
    }
  }
  return points;
}

/**
 * Largest square of visited tiles, by dynamic programming on the side of the
 * square ending at each tile (its bottom-right corner).
 */
export function maxSquare(points: TilePoint[]): TileSquare | null {
  const sorted = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const sides = new Map<number, number>();
  let best: TileSquare | null = null;
  for (const [x, y] of sorted) {
    const side =
      1 +
      Math.min(
        sides.get(keyOf(x - 1, y)) ?? 0,
        sides.get(keyOf(x, y - 1)) ?? 0,
        sides.get(keyOf(x - 1, y - 1)) ?? 0,
      );
    sides.set(keyOf(x, y), side);
    if (!best || side > best.size) {
      best = { x: x - side + 1, y: y - side + 1, size: side };
    }
  }
  return best;
}

const NEIGHBORS: TilePoint[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Cluster tiles, as defined by the usual tile explorers: visited tiles whose
 * four neighbors are visited too. Returns them and the largest group of them
 * connected by their sides.
 */
export function clusters(points: TilePoint[]): {
  clusterTiles: TilePoint[];
  maxCluster: TilePoint[];
} {
  const visited = new Set(points.map(([x, y]) => keyOf(x, y)));
  const inner = new Map<number, TilePoint>();
  for (const [x, y] of points) {
    if (NEIGHBORS.every(([dx, dy]) => visited.has(keyOf(x + dx, y + dy)))) {
      inner.set(keyOf(x, y), [x, y]);
    }
  }
  const seen = new Set<number>();
  let maxCluster: TilePoint[] = [];
  for (const [key, start] of inner) {
    if (seen.has(key)) continue;
    seen.add(key);
    const group: TilePoint[] = [];
    const queue = [start];
    for (let point = queue.pop(); point; point = queue.pop()) {
      group.push(point);
      for (const [dx, dy] of NEIGHBORS) {
        const next = keyOf(point[0] + dx, point[1] + dy);
        const neighbor = inner.get(next);
        if (neighbor && !seen.has(next)) {
          seen.add(next);
          queue.push(neighbor);
        }
      }
    }
    if (group.length > maxCluster.length) maxCluster = group;
  }
  return { clusterTiles: [...inner.values()], maxCluster };
}

export function levelMetrics(points: TilePoint[]): LevelMetrics {
  return {
    visited: points.length,
    maxSquare: maxSquare(points),
    ...clusters(points),
  };
}

export function tileMetrics(cells: TileCell[]): TileMetrics {
  return {
    tiles: levelMetrics(tilePoints(cells)),
    subtiles: levelMetrics(subtilePoints(cells)),
  };
}

/** Metrics of one level, as stored once computed. */
export interface StoredLevelMetrics {
  visited: number;
  maxSquare: TileSquare | null;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  clustered: number;
}

export interface StoredMetrics {
  tiles: StoredLevelMetrics;
  subtiles: StoredLevelMetrics;
}

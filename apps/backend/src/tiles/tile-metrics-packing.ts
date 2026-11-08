import { type TileCell, TileSet } from './tile-grid';
import type {
  LevelMetrics,
  TilePoint,
  StoredLevelMetrics,
  StoredMetrics,
  TileMetrics,
} from './tile-metrics';

/** Tiles in typed arrays, copied cheaply to and from a worker thread. */
export interface PackedCells {
  xs: Int32Array<ArrayBuffer>;
  ys: Int32Array<ArrayBuffer>;
  /** Signed 64-bit masks. */
  masks: BigInt64Array<ArrayBuffer>;
}

/** Large tiles in typed arrays. */
export interface PackedPoints {
  xs: Int32Array<ArrayBuffer>;
  ys: Int32Array<ArrayBuffer>;
}

/** Metrics computed by the worker thread, with the cluster tiles and those of the largest clusters. */
export interface PackedMetrics {
  metrics: StoredMetrics;
  /** Large tiles of the largest cluster of large tiles. */
  tileCluster: PackedPoints;
  /** Largest cluster of small tiles, grouped by large tile. */
  subtileCluster: PackedCells;
  /** Cluster tiles among the large tiles. */
  tileClusters: PackedPoints;
  /** Cluster tiles among the small tiles, grouped by large tile. */
  subtileClusters: PackedCells;
}

export function packCells(cells: TileCell[]): PackedCells {
  const packed: PackedCells = {
    xs: new Int32Array(cells.length),
    ys: new Int32Array(cells.length),
    masks: new BigInt64Array(cells.length),
  };
  cells.forEach(({ x, y, mask }, i) => {
    packed.xs[i] = x;
    packed.ys[i] = y;
    packed.masks[i] = BigInt.asIntN(64, mask);
  });
  return packed;
}

function packPoints(points: TilePoint[]): PackedPoints {
  return {
    xs: Int32Array.from(points, ([x]) => x),
    ys: Int32Array.from(points, ([, y]) => y),
  };
}

/** Small tiles, grouped by large tile. */
function packSubtiles(points: TilePoint[]): PackedCells {
  const set = new TileSet();
  for (const [x, y] of points) set.add(x, y);
  return packCells(set.cells());
}

function storedLevel({
  visited,
  maxSquare,
  maxCluster,
  clusterTiles,
}: LevelMetrics): StoredLevelMetrics {
  return {
    visited,
    maxSquare,
    maxCluster: maxCluster.length,
    clustered: clusterTiles.length,
  };
}

export function packMetrics({ tiles, subtiles }: TileMetrics): PackedMetrics {
  return {
    metrics: { tiles: storedLevel(tiles), subtiles: storedLevel(subtiles) },
    tileCluster: packPoints(tiles.maxCluster),
    subtileCluster: packSubtiles(subtiles.maxCluster),
    tileClusters: packPoints(tiles.clusterTiles),
    subtileClusters: packSubtiles(subtiles.clusterTiles),
  };
}

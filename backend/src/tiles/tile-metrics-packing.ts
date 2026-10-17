import { type TileCell, TileSet } from './tile-grid';
import type {
  LevelMetrics,
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

/** Metrics computed by the worker thread, with the tiles of the largest clusters. */
export interface PackedMetrics {
  metrics: StoredMetrics;
  /** Large tiles of the largest cluster of large tiles. */
  tileCluster: { xs: Int32Array<ArrayBuffer>; ys: Int32Array<ArrayBuffer> };
  /** Largest cluster of small tiles, grouped by large tile. */
  subtileCluster: PackedCells;
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

function storedLevel({
  visited,
  maxSquare,
  maxCluster,
  clustered,
}: LevelMetrics): StoredLevelMetrics {
  return { visited, maxSquare, maxCluster: maxCluster.length, clustered };
}

export function packMetrics({ tiles, subtiles }: TileMetrics): PackedMetrics {
  const subtileCluster = new TileSet();
  for (const [x, y] of subtiles.maxCluster) subtileCluster.add(x, y);
  return {
    metrics: { tiles: storedLevel(tiles), subtiles: storedLevel(subtiles) },
    tileCluster: {
      xs: Int32Array.from(tiles.maxCluster, ([x]) => x),
      ys: Int32Array.from(tiles.maxCluster, ([, y]) => y),
    },
    subtileCluster: packCells(subtileCluster.cells()),
  };
}

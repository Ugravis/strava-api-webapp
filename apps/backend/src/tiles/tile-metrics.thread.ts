import { parentPort } from 'node:worker_threads';
import type { TileCell } from './tile-grid';
import { tileMetrics } from './tile-metrics';
import { type PackedCells, packMetrics } from './tile-metrics-packing';

/**
 * Worker thread computing the metrics of one set of tiles: tens of
 * thousands of large tiles take about a second, which must not block the
 * event loop of the API.
 */
parentPort?.once('message', ({ xs, ys, masks }: PackedCells) => {
  const cells: TileCell[] = [];
  for (let i = 0; i < xs.length; i++) {
    cells.push({ x: xs[i], y: ys[i], mask: BigInt.asUintN(64, masks[i]) });
  }
  parentPort?.postMessage(packMetrics(tileMetrics(cells)));
});

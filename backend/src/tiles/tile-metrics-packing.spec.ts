import { packCells, packMetrics } from './tile-metrics-packing';
import { tileMetrics } from './tile-metrics';

describe('tile metrics packing', () => {
  it('packs the masks as signed 64-bit integers', () => {
    const packed = packCells([
      { x: 3, y: 4, mask: 1n << 63n },
      { x: 5, y: 6, mask: 0b101n },
    ]);
    expect([...packed.xs]).toEqual([3, 5]);
    expect([...packed.ys]).toEqual([4, 6]);
    expect([...packed.masks]).toEqual([-(1n << 63n), 0b101n]);
  });

  it('keeps the counts and groups the largest cluster of small tiles by large tile', () => {
    // A full large tile: its 36 inner small tiles form one cluster.
    const packed = packMetrics(tileMetrics([{ x: 2, y: 3, mask: -1n }]));
    expect(packed.metrics.subtiles).toEqual({
      visited: 64,
      maxSquare: { x: 16, y: 24, size: 8 },
      maxCluster: 36,
      clustered: 36,
    });
    expect(packed.metrics.tiles.visited).toBe(1);
    expect([...packed.tileCluster.xs]).toEqual([]);
    expect([...packed.subtileCluster.xs]).toEqual([2]);
    expect([...packed.subtileCluster.ys]).toEqual([3]);
    // Every small tile but the border ones.
    expect(packed.subtileCluster.masks[0]).toBe(0x007e7e7e7e7e7e00n);
    expect([...packed.subtileClusters.xs]).toEqual([2]);
    expect(packed.subtileClusters.masks[0]).toBe(0x007e7e7e7e7e7e00n);
    expect([...packed.tileClusters.xs]).toEqual([]);
  });
});

import { activityGains, TileHistory } from './activity-gains';
import type { TilePoint } from './tile-metrics';

/** The tiles of a `width × height` block whose top-left tile is `(x, y)`. */
function block(
  x: number,
  y: number,
  width: number,
  height: number,
): TilePoint[] {
  const points: TilePoint[] = [];
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) points.push([x + dx, y + dy]);
  }
  return points;
}

describe('TileHistory', () => {
  it('counts the tiles no earlier activity crossed', () => {
    const history = new TileHistory();
    expect(history.add(block(0, 0, 2, 1)).gained).toEqual([
      [0, 0],
      [1, 0],
    ]);
    expect(history.add(block(1, 0, 2, 1)).gained).toEqual([[2, 0]]);
  });

  it('grows the largest cluster with the tiles completed', () => {
    const history = new TileHistory();
    expect(history.add(block(0, 0, 3, 3))).toMatchObject({
      maxCluster: 1,
      otherClusters: 0,
    });
    // The block becomes 4 × 3: its two inner tiles form the largest cluster.
    expect(history.add(block(3, 0, 1, 3))).toMatchObject({
      maxCluster: 1,
      otherClusters: 0,
    });
  });

  it('counts the cluster tiles outside of the largest cluster', () => {
    const history = new TileHistory();
    history.add(block(0, 0, 4, 3));
    expect(history.add(block(10, 0, 3, 3))).toMatchObject({
      maxCluster: 0,
      otherClusters: 1,
    });
  });

  it('counts the clusters merged into the largest one', () => {
    const history = new TileHistory();
    history.add(block(0, 0, 4, 3));
    history.add(block(5, 0, 3, 3));
    // Filling the gap joins both blocks: one cluster of 6 tiles, from 2.
    expect(history.add(block(4, 0, 1, 3))).toMatchObject({
      maxCluster: 4,
      otherClusters: 0,
    });
  });
});

describe('TileHistory largest square', () => {
  it('grows the side of the largest square', () => {
    const history = new TileHistory();
    expect(history.add(block(0, 0, 2, 2)).maxSquare).toBe(2);
    expect(history.add(block(2, 0, 1, 3)).maxSquare).toBe(0);
    // Completing the bottom row makes a 3 × 3 square.
    expect(history.add(block(0, 2, 2, 1)).maxSquare).toBe(1);
  });

  it('ignores the squares elsewhere than the largest one', () => {
    const history = new TileHistory();
    history.add(block(0, 0, 4, 4));
    expect(history.add(block(10, 10, 3, 3)).maxSquare).toBe(0);
    expect(history.add(block(4, 0, 1, 5)).maxSquare).toBe(0);
    expect(history.add(block(0, 4, 4, 1)).maxSquare).toBe(1);
  });
});

describe('activityGains', () => {
  it('measures each level in the order of the activities', () => {
    const [first, second] = activityGains([
      { xs: [0], ys: [0], masks: [0b11n] },
      { xs: [0, 1], ys: [0, 0], masks: [0b110n, 1n] },
    ]);
    expect(first.tiles.gained).toHaveLength(1);
    expect(first.subtiles.gained).toHaveLength(2);
    expect(second.tiles.gained).toEqual([[1, 0]]);
    expect(second.subtiles.gained).toEqual([
      [2, 0],
      [8, 0],
    ]);
  });
});

import {
  clusters,
  maxSquare,
  subtilePoints,
  type TilePoint,
  tileMetrics,
  tilePoints,
} from './tile-metrics';

/** Tiles drawn as rows of `#` (visited) and `.`, the first one at `(0, 0)`. */
function grid(...rows: string[]): TilePoint[] {
  return rows.flatMap((row, y) =>
    [...row].flatMap((char, x): TilePoint[] => (char === '#' ? [[x, y]] : [])),
  );
}

const sorted = (points: TilePoint[]) =>
  [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

describe('tile metrics', () => {
  describe('maxSquare', () => {
    it('is null without visited tiles', () => {
      expect(maxSquare([])).toBeNull();
    });

    it('finds the largest square and its top-left tile', () => {
      const points = grid(
        '##....', //
        '##.###',
        '...###',
        '#..###',
      );
      expect(maxSquare(points)).toEqual({ x: 3, y: 1, size: 3 });
    });

    it('ignores the order of the tiles', () => {
      const points = grid('###', '###', '##.').reverse();
      expect(maxSquare(points)).toEqual({ x: 0, y: 0, size: 2 });
    });
  });

  describe('clusters', () => {
    it('keeps the tiles whose four neighbors are visited', () => {
      const result = clusters(
        grid(
          '.###.', //
          '#####',
          '.###.',
        ),
      );
      expect(sorted(result.maxCluster)).toEqual([
        [1, 1],
        [2, 1],
        [3, 1],
      ]);
      expect(result.clustered).toBe(3);
    });

    it('returns the largest of the disconnected clusters', () => {
      const result = clusters(
        grid(
          '.#....#..', //
          '###..###.',
          '.#..####.',
          '.....##..',
        ),
      );
      expect(sorted(result.maxCluster)).toEqual([
        [6, 1],
        [5, 2],
        [6, 2],
      ]);
      expect(result.clustered).toBe(4);
    });

    it('is empty without enclosed tiles', () => {
      expect(clusters(grid('###', '#.#', '###'))).toEqual({
        clustered: 0,
        maxCluster: [],
      });
    });
  });

  describe('tile levels', () => {
    it('expands the small tiles of a large tile', () => {
      const cells = [
        { x: 2, y: 3, mask: (1n << 0n) | (1n << 9n) | (1n << 63n) },
      ];
      expect(sorted(subtilePoints(cells))).toEqual([
        [16, 24],
        [17, 25],
        [23, 31],
      ]);
      expect(tilePoints(cells)).toEqual([[2, 3]]);
    });

    it('measures both levels', () => {
      const full = (1n << 64n) - 1n;
      const metrics = tileMetrics([
        { x: 0, y: 0, mask: full },
        { x: 1, y: 0, mask: full },
      ]);
      expect(metrics.tiles).toEqual({
        visited: 2,
        maxSquare: { x: 0, y: 0, size: 1 },
        maxCluster: [],
        clustered: 0,
      });
      expect(metrics.subtiles.visited).toBe(128);
      expect(metrics.subtiles.maxSquare).toEqual({ x: 0, y: 0, size: 8 });
      expect(metrics.subtiles.clustered).toBe(14 * 6);
    });
  });
});

import { countSubtiles, type LatLng } from './tile-grid';
import {
  assessTrack,
  hiddenAreaRadius,
  tilesFromStream,
  tilesFromSummary,
} from './track-tiles';

/** Points every `stepM` meters going east from a point near Troyes. */
function eastward(count: number, stepM: number, from: LatLng = [48.3, 4.08]) {
  const degPerMeter = 1 / (111_320 * Math.cos((from[0] * Math.PI) / 180));
  return Array.from({ length: count }, (_, i): LatLng => [
    from[0],
    from[1] + i * stepM * degPerMeter,
  ]);
}

describe('track tiles', () => {
  it('flags summaries whose points are too far apart', () => {
    const points = eastward(100, 100);

    expect(
      assessTrack({ points, distanceM: 10_000, start: null, end: null }).sparse,
    ).toBe(false);
    expect(
      assessTrack({ points, distanceM: 100_000, start: null, end: null })
        .sparse,
    ).toBe(true);
  });

  it('measures the cropped start and end', () => {
    const points = eastward(50, 100);
    const assessment = assessTrack({
      points,
      distanceM: 5_000,
      start: eastward(1, 0, [48.3, 4.076])[0],
      end: points[points.length - 1],
    });

    expect(assessment.hiddenStartM).toBeGreaterThan(250);
    expect(assessment.hiddenStartM).toBeLessThan(350);
    expect(assessment.hiddenEndM).toBe(0);
  });

  it('ignores the GPS noise below the crop threshold', () => {
    const points = eastward(10, 100);
    const assessment = assessTrack({
      points,
      distanceM: 1_000,
      start: eastward(2, 10)[1],
      end: points[9],
    });

    expect(assessment.hiddenStartM).toBe(0);
  });

  it('marks the area around a cropped start as hidden', () => {
    const points = eastward(30, 100);
    const tiles = tilesFromSummary(
      { points, distanceM: 3_000, start: null, end: null },
      { sparse: false, hiddenStartM: 300, hiddenEndM: 0 },
    );

    expect(tiles.hidden.isEmpty).toBe(false);
    expect(tiles.shared).toBe(tiles.visited);
  });

  it('keeps the hidden parts of a full track out of the shared tiles', () => {
    const points = eastward(40, 50);
    const tiles = tilesFromStream(points, 300, 0);
    const count = (set: typeof tiles.visited) =>
      set.cells().reduce((sum, cell) => sum + countSubtiles(cell.mask), 0);

    expect(hiddenAreaRadius(300)).toBe(500);
    expect(tiles.shared.cells().length).toBeGreaterThan(0);
    expect(count(tiles.shared)).toBeLessThan(count(tiles.visited));
  });
});

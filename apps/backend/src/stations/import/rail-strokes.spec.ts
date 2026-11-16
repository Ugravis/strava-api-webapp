import {
  buildStrokes as build,
  RAIL_DETAIL_ZOOM,
  reversals,
  type SegmentEnds,
  strokeZooms,
} from './rail-strokes';

const buildStrokes = (segments: SegmentEnds[]) => build(segments).strokes;

/** A straight segment from `start` to `end`. */
function segment(
  id: number,
  start: [number, number],
  end: [number, number],
  lengthM = 1000,
): SegmentEnds {
  const heading = (from: [number, number], to: [number, number]) =>
    Math.atan2(to[1] - from[1], to[0] - from[0]);
  return {
    id,
    start,
    end,
    startHeading: heading(start, end),
    endHeading: heading(end, start),
    lengthM,
  };
}

describe('buildStrokes', () => {
  it('joins the segments running straight on, whatever their direction', () => {
    const strokes = buildStrokes([
      segment(1, [0, 0], [1, 0]),
      segment(2, [2, 0], [1, 0]),
      segment(3, [2, 0], [3, 0]),
    ]);
    expect(strokes).toHaveLength(1);
    expect(strokes[0]).toEqual([0, 1, 2]);
  });

  it('carries a line on through a junction, the branch apart', () => {
    const strokes = buildStrokes([
      segment(1, [0, 0], [1, 0]),
      segment(2, [1, 0], [2, 0.1]),
      // The branch, at a right angle.
      segment(3, [1, 0], [1, 1]),
    ]);
    expect(strokes.map((stroke) => [...stroke].sort())).toEqual(
      expect.arrayContaining([[0, 1], [2]]),
    );
  });

  it('joins ends a few dozen metres apart, as at a station', () => {
    expect(
      buildStrokes([
        segment(1, [0, 0], [1, 0]),
        segment(2, [1.0003, 0], [2, 0]),
      ]),
    ).toHaveLength(1);
    expect(
      buildStrokes([segment(1, [0, 0], [1, 0]), segment(2, [1.01, 0], [2, 0])]),
    ).toHaveLength(2);
  });

  it('cuts at a sharp bend', () => {
    expect(
      buildStrokes([segment(1, [0, 0], [1, 0]), segment(2, [1, 0], [0, 0.2])]),
    ).toHaveLength(2);
  });

  it('tells which segments run against their line', () => {
    const built = build([
      segment(1, [0, 0], [1, 0]),
      segment(2, [2, 0], [1, 0]),
      segment(3, [2, 0], [3, 0]),
    ]);
    const runs = built.strokes[0].map((index, order) => [
      index,
      reversals(built, 0)[order],
    ]);
    // Along the line from west to east or the other way round, the middle one runs against the others.
    const middle = runs.find(([index]) => index === 1)![1];
    expect(
      runs
        .filter(([index]) => index !== 1)
        .every(([, reversed]) => reversed !== middle),
    ).toBe(true);
  });

  it('ends on a loop', () => {
    const strokes = buildStrokes([
      segment(1, [0, 0], [1, 0]),
      segment(2, [1, 0], [2, 0]),
      segment(3, [2, 0], [0, 0]),
    ]);
    expect(strokes.flat().sort()).toEqual([0, 1, 2]);
  });
});

describe('strokeZooms', () => {
  const km = 1000;

  it('shows a short link between two lines shown with them', () => {
    // Two long lines, west and east, joined by a short one bending away from both.
    const segments = [
      segment(1, [0, 0], [0, 10], 3000 * km),
      segment(2, [0.05, 10.05], [0.05, 0.05], 3000 * km),
      segment(3, [0, 10], [0.05, 10.05], 5 * km),
    ];
    expect(new Set(strokeZooms(build(segments), segments))).toEqual(
      new Set([0]),
    );
  });

  it('keeps the longest lines of a dense region zoomed out, every line from the detail zoom', () => {
    // Twenty parallel lines in the same cell, the first the longest.
    const segments = Array.from({ length: 20 }, (_, i) => i).map((i) =>
      segment(i, [i * 0.01, 0], [i * 0.01, 5], (3000 - i * 100) * km),
    );
    const zooms = strokeZooms(build(segments), segments);
    expect(zooms.filter((zoom) => zoom === 0)).toHaveLength(16);
    expect(Math.max(...zooms)).toBeLessThanOrEqual(RAIL_DETAIL_ZOOM);
  });
});

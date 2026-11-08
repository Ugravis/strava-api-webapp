import { addLevel, type TileTotals } from './tile-totals';

const none: TileTotals = { tiles: 0, subtiles: 0 };

describe('addLevel', () => {
  it('counts every descendant of a tile covered above zoom 14', () => {
    expect(addLevel(none, 12, 1, 5)).toEqual({ tiles: 16, subtiles: 1024 });
  });

  it('counts the partial tiles of zoom 14 as large tiles', () => {
    expect(addLevel(none, 14, 2, 3)).toEqual({ tiles: 5, subtiles: 128 });
  });

  it('counts only small tiles between zoom 15 and 17', () => {
    expect(addLevel(none, 15, 1, 7)).toEqual({ tiles: 0, subtiles: 16 });
    expect(addLevel(none, 17, 4, 6)).toEqual({ tiles: 0, subtiles: 10 });
  });

  it('adds to the previous totals', () => {
    expect(addLevel({ tiles: 10, subtiles: 640 }, 16, 1, 0)).toEqual({
      tiles: 10,
      subtiles: 644,
    });
  });
});

import { reorderedPositions } from './reorder';

describe('reorderedPositions', () => {
  const positions = new Map([
    ['a', 1],
    ['b', 2],
    ['c', 3],
    ['d', 4],
  ]);

  it('gives the listed items the positions they held between them', () => {
    expect(reorderedPositions(positions, ['d', 'b'])).toEqual([
      ['d', 2],
      ['b', 4],
    ]);
  });

  it('ignores unknown ids', () => {
    expect(reorderedPositions(positions, ['x', 'c', 'a'])).toEqual([
      ['c', 1],
      ['a', 3],
    ]);
  });
});

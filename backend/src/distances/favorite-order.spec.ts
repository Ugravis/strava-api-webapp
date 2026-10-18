import { favoriteOrder } from './favorite-order';

describe('Favorite order', () => {
  it('follows the requested order', () => {
    expect(favoriteOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('ignores unknown and repeated badges', () => {
    expect(favoriteOrder(['a', 'b'], ['b', 'x', 'b', 'a'])).toEqual(['b', 'a']);
  });

  it('keeps the badges left out after the others, in their order', () => {
    expect(favoriteOrder(['a', 'b', 'c', 'd'], ['d', 'b'])).toEqual([
      'd',
      'b',
      'a',
      'c',
    ]);
  });
});

import { movedOrder } from './table-move';

describe('movedOrder', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('places the row right before `before`', () => {
    expect(movedOrder(order, { id: 'd', after: 'a', before: 'b' })).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('places the row right after `after` when last of the page', () => {
    expect(movedOrder(order, { id: 'a', after: 'c', before: null })).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('falls back on `after` when `before` is unknown', () => {
    expect(movedOrder(order, { id: 'a', after: 'b', before: 'x' })).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('refuses an unknown row or neighbours', () => {
    expect(movedOrder(order, { id: 'x', after: 'a', before: null })).toBeNull();
    expect(
      movedOrder(order, { id: 'a', after: null, before: null }),
    ).toBeNull();
  });
});

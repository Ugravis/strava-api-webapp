import { TileSet } from '../tiles/tile-grid';
import { placeTile } from './station-tile';

describe('placeTile', () => {
  it('gives the large tile and the bit of the small tile, as the tile sets do', () => {
    // Gare de Melun.
    const { x, y, bit } = placeTile(2.6551924, 48.5274833);
    const set = new TileSet();
    set.add(x * 8 + (bit % 8), y * 8 + Math.floor(bit / 8));

    expect(set.cells()).toEqual([{ x, y, mask: 1n << BigInt(bit) }]);
    expect([x, y]).toEqual([8312, 5659]);
  });
});

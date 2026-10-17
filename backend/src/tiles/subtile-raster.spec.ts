import { inflateSync } from 'node:zlib';
import {
  encodePng,
  RASTER_CLUSTER,
  RASTER_EMPTY,
  RASTER_SIZE,
  RASTER_SUBTILE,
  rasterIndices,
} from './subtile-raster';

const at = (pixels: Uint8Array, x: number, y: number) =>
  pixels[y * RASTER_SIZE + x];

describe('subtile raster', () => {
  it('covers 64 pixels per small tile at zoom 14', () => {
    // Small tile (1, 2) of the large tile (8, 5), map tile (14, 8, 5).
    const pixels = rasterIndices(
      [{ x: 8, y: 5, mask: 1n << 17n, clusterMask: 0n }],
      14,
      8,
      5,
    );
    expect(at(pixels, 64, 128)).toBe(RASTER_SUBTILE);
    expect(at(pixels, 127, 191)).toBe(RASTER_SUBTILE);
    expect(at(pixels, 128, 128)).toBe(RASTER_EMPTY);
    expect(pixels.filter((pixel) => pixel !== RASTER_EMPTY)).toHaveLength(
      64 * 64,
    );
  });

  it('keeps one pixel for a small tile smaller than a pixel', () => {
    // At zoom 5, a map tile spans 4096 small tiles: eight per pixel.
    const pixels = rasterIndices(
      [{ x: 512 * 3 + 100, y: 512 * 2, mask: 1n << 63n, clusterMask: 0n }],
      5,
      3,
      2,
    );
    expect(at(pixels, 100, 0)).toBe(RASTER_SUBTILE);
    expect(pixels.filter((pixel) => pixel !== RASTER_EMPTY)).toHaveLength(1);
  });

  it('draws the largest cluster over the other small tiles', () => {
    const pixels = rasterIndices(
      [{ x: 0, y: 0, mask: 0b11n, clusterMask: 0b10n }],
      14,
      0,
      0,
    );
    expect(at(pixels, 0, 0)).toBe(RASTER_SUBTILE);
    expect(at(pixels, 64, 0)).toBe(RASTER_CLUSTER);
  });

  it('encodes an indexed PNG with a transparent background', async () => {
    const pixels = new Uint8Array(4 * 4).fill(RASTER_SUBTILE);
    const png = await encodePng(pixels, [[124, 58, 237, 90]]);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(4);
    const idat = png.indexOf('IDAT');
    const length = png.readUInt32BE(idat - 4);
    const raw = inflateSync(png.subarray(idat + 4, idat + 4 + length));
    expect([...raw.subarray(0, 5)]).toEqual([0, 1, 1, 1, 1]);
    const trns = png.indexOf('tRNS');
    expect([...png.subarray(trns + 4, trns + 6)]).toEqual([0, 90]);
  });
});

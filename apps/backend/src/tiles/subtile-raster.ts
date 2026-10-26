import { crc32, deflate } from 'node:zlib';
import { promisify } from 'node:util';
import { SUBTILE_ZOOM, TILE_ZOOM } from './tile-grid';

const deflateAsync = promisify(deflate);

/** Side of the images in pixels: twice a 256 pixels map tile, sharp on high density screens. */
export const RASTER_SIZE = 512;
const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);

/** Palette indexes of the pixels. */
export const RASTER_EMPTY = 0;
export const RASTER_SUBTILE = 1;
export const RASTER_CLUSTER = 2;
export const RASTER_MAX_CLUSTER = 3;

/** A large tile and its small tiles, visited, in a cluster and in the largest cluster. */
export interface RasterCell {
  x: number;
  y: number;
  /** Unsigned 64-bit masks. */
  mask: bigint;
  clusterMask: bigint;
  maxClusterMask: bigint;
}

/** Red, green, blue and alpha, from 0 to 255. */
export type Rgba = [number, number, number, number];

/** Calls `visit` with the index (0 to 63) of every bit set in an unsigned 64-bit mask. */
function forEachBit(mask: bigint, visit: (bit: number) => void): void {
  for (const [half, offset] of [
    [Number(mask & 0xffffffffn), 0],
    [Number(mask >> 32n), 32],
  ]) {
    for (let rest = half; rest !== 0; rest = (rest & (rest - 1)) >>> 0) {
      visit(offset + 31 - Math.clz32(rest & -rest));
    }
  }
}

/**
 * Palette indexes of the image of the map tile `(zoom, tileX, tileY)`: each
 * visited small tile covers its pixels, at least one when it is smaller,
 * those of a cluster cover the others, and those of the largest cluster
 * cover all of them.
 */
export function rasterIndices(
  cells: RasterCell[],
  zoom: number,
  tileX: number,
  tileY: number,
): Uint8Array {
  const pixels = new Uint8Array(RASTER_SIZE * RASTER_SIZE);
  const span = 2 ** (TILE_ZOOM - zoom);
  const scale = RASTER_SIZE / (span * SUBTILES_PER_SIDE);
  const paint = (cell: RasterCell, bit: number, index: number) => {
    const sx =
      (cell.x - tileX * span) * SUBTILES_PER_SIDE + (bit % SUBTILES_PER_SIDE);
    const sy =
      (cell.y - tileY * span) * SUBTILES_PER_SIDE +
      Math.floor(bit / SUBTILES_PER_SIDE);
    const x0 = Math.floor(sx * scale);
    const y0 = Math.floor(sy * scale);
    const x1 = Math.max(x0 + 1, Math.floor((sx + 1) * scale));
    const y1 = Math.max(y0 + 1, Math.floor((sy + 1) * scale));
    for (let y = y0; y < y1; y++) {
      pixels.fill(index, y * RASTER_SIZE + x0, y * RASTER_SIZE + x1);
    }
  };
  for (const cell of cells) {
    forEachBit(cell.mask, (bit) => paint(cell, bit, RASTER_SUBTILE));
  }
  for (const cell of cells) {
    forEachBit(cell.clusterMask, (bit) => paint(cell, bit, RASTER_CLUSTER));
  }
  for (const cell of cells) {
    forEachBit(cell.maxClusterMask, (bit) =>
      paint(cell, bit, RASTER_MAX_CLUSTER),
    );
  }
  return pixels;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Indexed PNG of square `pixels`: palette entry 0 is transparent, the
 * others take the `colors` in order.
 */
export async function encodePng(
  pixels: Uint8Array,
  colors: Rgba[],
): Promise<Buffer> {
  const size = Math.sqrt(pixels.length);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  // Bit depth 8, indexed color, default compression, filter and no interlace.
  header.set([8, 3, 0, 0, 0], 8);
  const palette = [[0, 0, 0, 0] as Rgba, ...colors];
  // Each row starts with its filter type: none.
  const raw = Buffer.alloc(size * (size + 1));
  for (let row = 0; row < size; row++) {
    raw.set(
      pixels.subarray(row * size, (row + 1) * size),
      row * (size + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('PLTE', Buffer.from(palette.flatMap(([r, g, b]) => [r, g, b]))),
    chunk('tRNS', Buffer.from(palette.map(([, , , a]) => a))),
    chunk('IDAT', await deflateAsync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

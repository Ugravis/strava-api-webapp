import {
  countSubtiles,
  diskTiles,
  fromSignedMask,
  type LatLng,
  rasterizeTrack,
  rasterizeTrackOutside,
  SUBTILE_ZOOM,
  TILE_ZOOM,
  TileSet,
  tilePosition,
  toSignedMask,
} from './tile-grid';
import { decodePolyline } from './polyline';

/** Center of the small tile `(sx, sy)`, at zoom 17. */
function centerOf(sx: number, sy: number): LatLng {
  const n = 2 ** SUBTILE_ZOOM;
  const lng = ((sx + 0.5) / n) * 360 - 180;
  const lat =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (sy + 0.5)) / n))) * 180) /
    Math.PI;
  return [lat, lng];
}

function subtiles(set: TileSet): string[] {
  return set
    .cells()
    .flatMap(({ x, y, mask }) =>
      Array.from({ length: 64 }, (_, bit) => bit)
        .filter((bit) => (mask >> BigInt(bit)) & 1n)
        .map((bit) => `${x * 8 + (bit % 8)}/${y * 8 + Math.floor(bit / 8)}`),
    )
    .sort();
}

describe('tile grid', () => {
  it('places Paris in the expected tiles', () => {
    const [x, y] = tilePosition([48.8566, 2.3522], TILE_ZOOM);
    expect([Math.floor(x), Math.floor(y)]).toEqual([8299, 5636]);
  });

  it('groups small tiles by large tile, 8 × 8 per tile', () => {
    const set = new TileSet();
    set.add(16, 8); // tile (2, 1), bit 0
    set.add(23, 15); // tile (2, 1), bit 63
    set.add(24, 8); // tile (3, 1), bit 0

    expect(set.maskAt(2, 1)).toBe((1n << 63n) | 1n);
    expect(set.maskAt(3, 1)).toBe(1n);
  });

  it('follows the segments, not only the points', () => {
    const start = centerOf(1000, 2000);
    const end = centerOf(1004, 2000);

    expect(subtiles(rasterizeTrack([start, end]))).toEqual([
      '1000/2000',
      '1001/2000',
      '1002/2000',
      '1003/2000',
      '1004/2000',
    ]);
  });

  it('crosses diagonal segments through edge-adjacent tiles only', () => {
    const tiles = subtiles(
      rasterizeTrack([centerOf(1000, 2000), centerOf(1003, 2003)]),
    );

    expect(tiles).toContain('1000/2000');
    expect(tiles).toContain('1003/2003');
    // A connected path from one corner to the other: 3 steps on each axis.
    expect(tiles).toHaveLength(7);
  });

  it('counts a single point as one tile', () => {
    expect(subtiles(rasterizeTrack([centerOf(5, 6)]))).toEqual(['5/6']);
  });

  it('skips the parts of a track inside the hidden disks', () => {
    const track = [0, 1, 2, 3, 4].map((i) => centerOf(1000 + i, 2000));
    const visible = rasterizeTrackOutside(track, [
      { center: track[0], radiusM: 10 },
    ]);

    expect(subtiles(visible)).toEqual([
      '1001/2000',
      '1002/2000',
      '1003/2000',
      '1004/2000',
    ]);
  });

  it('covers the small tiles touching a disk', () => {
    const center = centerOf(1000, 2000);

    expect(subtiles(diskTiles(center, 1))).toEqual(['1000/2000']);
    // About 210 m wide at this latitude: 300 m reaches the next ring.
    expect(subtiles(diskTiles(center, 300)).length).toBeGreaterThanOrEqual(9);
  });

  it('round-trips masks through signed 64-bit integers', () => {
    const mask = (1n << 63n) | 5n;

    expect(toSignedMask(mask)).toBe('-9223372036854775803');
    expect(fromSignedMask(toSignedMask(mask))).toBe(mask);
    expect(countSubtiles(mask)).toBe(3);
  });

  it('decodes Google encoded polylines', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      [38.5, -120.2],
      [40.7, -120.95],
      [43.252, -126.453],
    ]);
  });
});

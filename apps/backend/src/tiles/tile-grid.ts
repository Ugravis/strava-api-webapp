/** `[latitude, longitude]`, the order used by Strava and polylines. */
export type LatLng = [number, number];

/** Large tiles: slippy-map tiles at zoom 14, about 1.7 km wide in France. */
export const TILE_ZOOM = 14;
/** Small tiles: zoom 17, 8 × 8 = 64 per large tile, about 210 m wide in France. */
export const SUBTILE_ZOOM = 17;
const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
const SUBTILE_SHIFT = Math.log2(SUBTILES_PER_SIDE);

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;

/** A large tile and the small tiles visited inside it: bit `8 × row + column`. */
export interface TileCell {
  x: number;
  y: number;
  /** Unsigned 64-bit mask. */
  mask: bigint;
}

/** Set of small tiles, grouped by large tile. */
export class TileSet {
  private readonly byTile = new Map<string, TileCell>();

  static of(cells: Iterable<TileCell>): TileSet {
    const set = new TileSet();
    for (const cell of cells) set.addMask(cell.x, cell.y, cell.mask);
    return set;
  }

  /** Adds the small tile `(sx, sy)` given at zoom 17. */
  add(sx: number, sy: number): void {
    const x = sx >> SUBTILE_SHIFT;
    const y = sy >> SUBTILE_SHIFT;
    const bit =
      (sy & (SUBTILES_PER_SIDE - 1)) * SUBTILES_PER_SIDE +
      (sx & (SUBTILES_PER_SIDE - 1));
    this.addMask(x, y, 1n << BigInt(bit));
  }

  addMask(x: number, y: number, mask: bigint): void {
    if (mask === 0n) return;
    const key = `${x}/${y}`;
    const cell = this.byTile.get(key);
    if (cell) {
      cell.mask |= mask;
    } else {
      this.byTile.set(key, { x, y, mask });
    }
  }

  maskAt(x: number, y: number): bigint {
    return this.byTile.get(`${x}/${y}`)?.mask ?? 0n;
  }

  cells(): TileCell[] {
    return [...this.byTile.values()];
  }

  get isEmpty(): boolean {
    return this.byTile.size === 0;
  }
}

/** Fractional position at `zoom` in the Web Mercator tile grid. */
export function tilePosition(
  [lat, lng]: LatLng,
  zoom: number,
): [number, number] {
  const n = 2 ** zoom;
  const clamped = Math.max(-85.05112878, Math.min(85.05112878, lat)) * DEG;
  return [
    ((lng + 180) / 360) * n,
    ((1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2) *
      n,
  ];
}

export function metersBetween(a: LatLng, b: LatLng): number {
  const x = (b[1] - a[1]) * DEG * Math.cos(((a[0] + b[0]) / 2) * DEG);
  const y = (b[0] - a[0]) * DEG;
  return Math.hypot(x, y) * EARTH_RADIUS_M;
}

/**
 * Visits every grid cell crossed by the segment `a → b`, given in grid
 * units (Amanatides & Woo traversal): the segments are followed, not only
 * the recorded points.
 */
function traverse(
  [ax, ay]: [number, number],
  [bx, by]: [number, number],
  visit: (x: number, y: number) => void,
): void {
  let x = Math.floor(ax);
  let y = Math.floor(ay);
  const endX = Math.floor(bx);
  const endY = Math.floor(by);
  const dx = bx - ax;
  const dy = by - ay;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const deltaX = dx === 0 ? Infinity : 1 / Math.abs(dx);
  const deltaY = dy === 0 ? Infinity : 1 / Math.abs(dy);
  let maxX = dx === 0 ? Infinity : (stepX > 0 ? x + 1 - ax : ax - x) * deltaX;
  let maxY = dy === 0 ? Infinity : (stepY > 0 ? y + 1 - ay : ay - y) * deltaY;
  visit(x, y);
  // Bounded: each step moves one cell closer to the end.
  for (
    let steps = Math.abs(endX - x) + Math.abs(endY - y);
    steps > 0;
    steps--
  ) {
    if (maxX < maxY) {
      x += stepX;
      maxX += deltaX;
    } else {
      y += stepY;
      maxY += deltaY;
    }
    visit(x, y);
  }
}

/** Small tiles crossed by a track. */
export function rasterizeTrack(points: LatLng[]): TileSet {
  const set = new TileSet();
  const positions = points.map((point) => tilePosition(point, SUBTILE_ZOOM));
  if (positions.length === 1) {
    traverse(positions[0], positions[0], (x, y) => set.add(x, y));
  }
  for (let i = 1; i < positions.length; i++) {
    traverse(positions[i - 1], positions[i], (x, y) => set.add(x, y));
  }
  return set;
}

/** Small tiles crossed by the parts of a track outside the given disks. */
export function rasterizeTrackOutside(
  points: LatLng[],
  disks: { center: LatLng; radiusM: number }[],
): TileSet {
  const hidden = (point: LatLng) =>
    disks.some((disk) => metersBetween(disk.center, point) <= disk.radiusM);
  const set = new TileSet();
  let run: LatLng[] = [];
  const flush = () => {
    if (run.length > 0) {
      for (const cell of rasterizeTrack(run).cells()) {
        set.addMask(cell.x, cell.y, cell.mask);
      }
    }
    run = [];
  };
  for (const point of points) {
    if (hidden(point)) {
      flush();
    } else {
      run.push(point);
    }
  }
  flush();
  return set;
}

/** Small tiles intersecting the disk of `radiusM` meters around `center`. */
export function diskTiles(center: LatLng, radiusM: number): TileSet {
  const set = new TileSet();
  const n = 2 ** SUBTILE_ZOOM;
  const latSpan = radiusM / (EARTH_RADIUS_M * DEG);
  const lngSpan = latSpan / Math.cos(center[0] * DEG);
  const [minX, minY] = tilePosition(
    [center[0] + latSpan, center[1] - lngSpan],
    SUBTILE_ZOOM,
  );
  const [maxX, maxY] = tilePosition(
    [center[0] - latSpan, center[1] + lngSpan],
    SUBTILE_ZOOM,
  );
  const lngOf = (x: number) => (x / n) * 360 - 180;
  const latOf = (y: number) =>
    Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) / DEG;
  for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
    for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
      // Closest point of the tile to the center.
      const nearest: LatLng = [
        Math.min(Math.max(center[0], latOf(y + 1)), latOf(y)),
        Math.min(Math.max(center[1], lngOf(x)), lngOf(x + 1)),
      ];
      if (metersBetween(center, nearest) <= radiusM) {
        set.add(x, y);
      }
    }
  }
  return set;
}

/** Number of small tiles in a mask. */
export function countSubtiles(mask: bigint): number {
  let count = 0;
  for (let rest = mask; rest !== 0n; rest &= rest - 1n) count++;
  return count;
}

/** PostgreSQL `bigint` is signed: masks are stored in two's complement. */
export function toSignedMask(mask: bigint): string {
  return BigInt.asIntN(64, mask).toString();
}

export function fromSignedMask(value: string | number | bigint): bigint {
  return BigInt.asUintN(64, BigInt(value));
}

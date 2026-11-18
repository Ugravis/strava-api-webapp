const METERS_PER_DEGREE = 111_320;

/** `[lon, lat]`. */
export type Point = [number, number];

export function metersBetween(
  [lon1, lat1]: Point,
  [lon2, lat2]: Point,
): number {
  const x = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(x, lat2 - lat1) * METERS_PER_DEGREE;
}

/** Points in cells of about 1 km, to find those near a point. */
export class PointIndex {
  private static readonly CELL_DEG = 0.01;
  private readonly cells = new Map<string, Point[]>();

  add(point: Point): void {
    const key = PointIndex.key(point[0], point[1]);
    const cell = this.cells.get(key);
    if (cell) cell.push(point);
    else this.cells.set(key, [point]);
  }

  hasPointNear([lon, lat]: Point, radiusM: number): boolean {
    const cos = Math.cos((lat * Math.PI) / 180);
    const cx = Math.floor(lon / PointIndex.CELL_DEG);
    const cy = Math.floor(lat / PointIndex.CELL_DEG);
    for (let x = cx - 1; x <= cx + 1; x++) {
      for (let y = cy - 1; y <= cy + 1; y++) {
        for (const [plon, plat] of this.cells.get(`${x}/${y}`) ?? []) {
          const dx = (plon - lon) * cos * METERS_PER_DEGREE;
          const dy = (plat - lat) * METERS_PER_DEGREE;
          if (dx * dx + dy * dy <= radiusM * radiusM) return true;
        }
      }
    }
    return false;
  }

  static cell(degrees: number): number {
    return Math.floor(degrees / PointIndex.CELL_DEG);
  }

  static key(lon: number, lat: number): string {
    return `${PointIndex.cell(lon)}/${PointIndex.cell(lat)}`;
  }
}

/** Distance from `p` to the segment `a → b`, and share of the segment of the nearest point. */
export function project(
  p: Point,
  a: Point,
  b: Point,
): { d: number; t: number } {
  // Local plane around `p`, in meters: exact enough within a few hundred meters.
  const kx = METERS_PER_DEGREE * Math.cos((p[1] * Math.PI) / 180);
  const ax = (a[0] - p[0]) * kx;
  const ay = (a[1] - p[1]) * METERS_PER_DEGREE;
  const dx = (b[0] - p[0]) * kx - ax;
  const dy = (b[1] - p[1]) * METERS_PER_DEGREE - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return { d: Math.hypot(ax + dx * t, ay + dy * t), t };
}

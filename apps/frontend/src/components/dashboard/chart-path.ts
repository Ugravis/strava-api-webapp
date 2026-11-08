/** A curve through the points, smoothed into cubic Bézier segments (Catmull-Rom). */
export function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  const [first, ...others] = points;
  let path = `M ${first[0]} ${first[1]}`;
  others.forEach((point, index) => {
    const p0 = points[Math.max(index - 1, 0)];
    const p1 = points[index];
    const p3 = points[Math.min(index + 2, points.length - 1)];
    const c1 = [p1[0] + (point[0] - p0[0]) / 6, p1[1] + (point[1] - p0[1]) / 6];
    const c2 = [point[0] - (p3[0] - p1[0]) / 6, point[1] - (p3[1] - p1[1]) / 6];
    path += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${point[0]} ${point[1]}`;
  });
  return path;
}

/**
 * A curve through points of increasing `x`, smoothed without overshooting
 * them (monotone cubic interpolation): a curve of distances never dips below
 * zero between two months.
 */
export function monotonePath(points: [number, number][]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  const slopes = points.slice(1).map((point, index) => (point[1] - points[index][1]) / (point[0] - points[index][0]));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === points.length - 1) return slopes[slopes.length - 1];
    const [before, after] = [slopes[index - 1], slopes[index]];
    // Flat at a peak or a trough, so that the curve stays between its points.
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length; index += 1) {
    const [x0, y0] = points[index - 1];
    const [x1, y1] = points[index];
    const third = (x1 - x0) / 3;
    path += ` C ${x0 + third} ${y0 + tangents[index - 1] * third}, ${x1 - third} ${y1 - tangents[index] * third}, ${x1} ${y1}`;
  }
  return path;
}

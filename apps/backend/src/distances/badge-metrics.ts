/**
 * What a badge counts. Distance, time and elevation add up the activities of
 * a family of sports; the others count what the user achieved, whatever the
 * sport. Units: meters, seconds, meters, then plain counts.
 */
export const BADGE_METRICS = [
  'distance',
  'time',
  'elevation',
  'activities',
  'active_days',
  'tiles',
  'subtiles',
  'stations',
] as const;

export type BadgeMetric = (typeof BADGE_METRICS)[number];

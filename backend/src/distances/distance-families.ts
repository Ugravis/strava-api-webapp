import type { SportType } from '../activities/sport-type';

/**
 * Groups of sports whose cumulated distance is compared to landmarks.
 * `all` counts every activity.
 */
export const DISTANCE_FAMILIES = [
  'all',
  'run',
  'hike',
  'ride',
  'swim',
] as const;

export type DistanceFamily = (typeof DISTANCE_FAMILIES)[number];

/**
 * Sports counted by each family, `all` excepted. Indoor variants (treadmill,
 * home trainer) count; electrically assisted rides do not.
 */
export const FAMILY_SPORT_TYPES: Record<
  Exclude<DistanceFamily, 'all'>,
  readonly SportType[]
> = {
  run: ['run', 'trail_run', 'virtual_run'],
  hike: ['walk', 'hike', 'snowshoe'],
  ride: ['ride', 'gravel_ride', 'mountain_bike_ride', 'virtual_ride'],
  swim: ['swim'],
};

import type { SportType } from '../activities/sport-type';

/**
 * Groups of sports whose cumulated distance is compared to landmarks.
 * `all` counts every activity.
 */
export const DISTANCE_FAMILIES = ['all', 'run', 'hike', 'ride'] as const;

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
};

export interface DistanceLandmark {
  /** Stable identifier, also used by clients for the name and the icon. */
  id: string;
  family: DistanceFamily;
  distanceM: number;
}

/** Known distances, ordered by family then by increasing distance. */
export const DISTANCE_LANDMARKS: readonly DistanceLandmark[] = [
  { id: 'earth_center', family: 'all', distanceM: 6_371_000 },
  { id: 'earth_circumference', family: 'all', distanceM: 40_075_000 },
  { id: 'earth_moon', family: 'all', distanceM: 384_400_000 },
  { id: 'paris_ring_road', family: 'run', distanceM: 35_000 },
  { id: 'marathon', family: 'run', distanceM: 42_195 },
  { id: 'lake_geneva', family: 'run', distanceM: 175_000 },
  { id: 'gr20', family: 'hike', distanceM: 180_000 },
  { id: 'camino_vezelay', family: 'hike', distanceM: 900_000 },
  { id: 'hexatrek', family: 'hike', distanceM: 3_000_000 },
  { id: 'pacific_crest_trail', family: 'hike', distanceM: 4_270_000 },
  { id: 'tour_de_france', family: 'ride', distanceM: 3_500_000 },
  { id: 'trans_siberian', family: 'ride', distanceM: 9_289_000 },
  { id: 'pan_american_highway', family: 'ride', distanceM: 24_000_000 },
];

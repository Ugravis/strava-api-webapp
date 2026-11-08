/**
 * Canonical sport types, independent of any data provider. Providers map
 * their own vocabulary onto this list; anything unknown becomes `other`.
 */
export const SPORT_TYPES = [
  'run',
  'trail_run',
  'virtual_run',
  'walk',
  'hike',
  'ride',
  'gravel_ride',
  'mountain_bike_ride',
  'e_bike_ride',
  'e_mountain_bike_ride',
  'virtual_ride',
  'swim',
  'alpine_ski',
  'backcountry_ski',
  'nordic_ski',
  'snowboard',
  'snowshoe',
  'rowing',
  'kayaking',
  'canoeing',
  'stand_up_paddling',
  'inline_skate',
  'wheelchair',
  'handcycle',
  'workout',
  'other',
] as const;

export type SportType = (typeof SPORT_TYPES)[number];

/** Sports practiced in a virtual world: their tracks are not real places. */
export const VIRTUAL_SPORT_TYPES: readonly SportType[] = [
  'virtual_run',
  'virtual_ride',
];

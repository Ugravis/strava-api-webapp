/** Sports a user may show as favorites on their profile: the families of the distance badges, sharing their icons. */
export const FAVORITE_SPORTS = ['run', 'hike', 'ride', 'swim'] as const;

export type FavoriteSport = (typeof FAVORITE_SPORTS)[number];

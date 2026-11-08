/** Parts of the business statistics page, kept in `?tab=`. */
export const BUSINESS_TABS = ["accounts", "sports", "exploration", "community", "strava"] as const;

export type BusinessTab = (typeof BUSINESS_TABS)[number];

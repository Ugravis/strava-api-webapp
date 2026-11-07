/** Parts of the site activity page, kept in `?tab=`. */
export const SITE_ACTIVITY_TABS = ["audience", "retention", "pages", "sessions", "params", "funnel"] as const;

export type SiteActivityTab = (typeof SITE_ACTIVITY_TABS)[number];

/** What a badge counts, as stored by the backend; units in `ADMIN_BADGE_UNITS`. */
export const ADMIN_BADGE_METRICS = [
  "distance",
  "time",
  "elevation",
  "activities",
  "active_days",
  "tiles",
  "subtiles",
  "stations",
] as const;
export type AdminBadgeMetric = (typeof ADMIN_BADGE_METRICS)[number];

/** Sports a badge counts; `all` counts every activity. */
export const ADMIN_BADGE_FAMILIES = ["all", "run", "hike", "ride", "swim"] as const;
export type AdminBadgeFamily = (typeof ADMIN_BADGE_FAMILIES)[number];

/** Unit of the amounts of a metric, as stored: meters, seconds or a count. */
export const ADMIN_BADGE_UNITS: Record<AdminBadgeMetric, "m" | "s" | "count"> = {
  distance: "m",
  time: "s",
  elevation: "m",
  activities: "count",
  active_days: "count",
  tiles: "count",
  subtiles: "count",
  stations: "count",
};

/** Slugs of the badges and collections: lowercase words joined by `_`. */
export const ADMIN_BADGE_SLUG = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
export const ADMIN_BADGE_ID_MAX_LENGTH = 64;
export const ADMIN_BADGE_THEME_ID_MAX_LENGTH = 32;
export const ADMIN_BADGE_NAME_MAX_LENGTH = 80;
export const ADMIN_BADGE_DESCRIPTION_MAX_LENGTH = 300;
export const ADMIN_BADGE_THEME_NAME_MAX_LENGTH = 40;
export const ADMIN_BADGE_TIERS_MAX = 20;

/** `GET /api/admin/badges`: a badge of the catalog. */
export interface AdminBadge {
  id: string;
  metric: AdminBadgeMetric;
  family: AdminBadgeFamily;
  /** Amount of one iteration, or the last tier, in the unit of the metric. */
  target: number;
  /** Ascending tiers of a badge completed once; null for a repeatable one. */
  tiers: number[] | null;
  name: string;
  description: string;
  themeId: string | null;
  icon: string;
  /** `#rrggbb`, null for the default card. */
  backgroundColor: string | null;
  position: number;
  active: boolean;
  /** Users having it in their favorites, then on their profile. */
  favoritesCount: number;
  profilesCount: number;
  createdAt: string;
}

/** A collection gathering badges across sports, e.g. astronomy. */
export interface AdminBadgeTheme {
  id: string;
  name: string;
  position: number;
}

/** `GET /api/admin/badge-themes/table`: a collection and its number of badges. */
export interface AdminBadgeThemeRow extends AdminBadgeTheme {
  badgesCount: number;
}

/** `GET /api/admin/badges`: the whole catalog, in display order. */
export interface AdminBadgeCatalog {
  themes: AdminBadgeTheme[];
  badges: AdminBadge[];
}

/** `PATCH /api/admin/badges/:id`: every field of a badge but its id. */
export interface UpdateBadgeRequest {
  metric: AdminBadgeMetric;
  family: AdminBadgeFamily;
  /** Ignored for a tiered badge, whose target is its last tier. */
  target: number;
  tiers: number[] | null;
  name: string;
  description: string;
  themeId: string | null;
  icon: string;
  backgroundColor: string | null;
}

/** `POST /api/admin/badges`. */
export interface CreateBadgeRequest extends UpdateBadgeRequest {
  id: string;
}

/** `PUT /api/admin/badges/:id/active`. */
export interface SetBadgeActiveRequest {
  active: boolean;
}

/** `PATCH /api/admin/badge-themes/:id`. */
export interface UpdateBadgeThemeRequest {
  name: string;
}

/** `POST /api/admin/badge-themes`. */
export interface CreateBadgeThemeRequest extends UpdateBadgeThemeRequest {
  id: string;
}


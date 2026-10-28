/** Preset titles of the maintenance banner, labelled by the frontend. */
export const MAINTENANCE_TITLES = [
  "scheduled",
  "ongoing",
  "degraded",
  "strava",
] as const;
export type MaintenanceTitle = (typeof MAINTENANCE_TITLES)[number];

export const MAINTENANCE_DESCRIPTION_MAX_LENGTH = 500;

/** The banner shown above the pages of the signed-in users. */
export interface MaintenanceBanner {
  title: MaintenanceTitle;
  description: string | null;
  /** When the banner was turned on, ISO 8601. */
  since: string;
}

/** `GET /api/system/status`: the switches the site reads, public. */
export interface SystemStatusResponse {
  maintenance: MaintenanceBanner | null;
  signupsEnabled: boolean;
}

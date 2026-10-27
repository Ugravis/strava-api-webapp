/** Days covered by the time series of the statistics, today included. */
export const ADMIN_STATISTICS_DAYS = 30;

/** Families the synchronized activities are split into; `other` gathers the remaining sports. */
export const ADMIN_SPORT_FAMILIES = ["ride", "run", "hike", "swim", "other"] as const;

export type AdminSportFamily = (typeof ADMIN_SPORT_FAMILIES)[number];

/** Strava quota at a point in time: the read quota, the one that binds. */
export interface AdminStravaUsagePoint {
  /** ISO 8601 start of the UTC day or of the quarter of an hour. */
  start: string;
  /** Null where no Strava call was made. */
  read: number | null;
  readLimit: number | null;
  /** Every request, reads included. */
  overall: number | null;
  overallLimit: number | null;
}

/** `GET /api/admin/statistics`: figures of the whole application. */
export interface AdminStatisticsResponse {
  generatedAt: string;
  users: {
    total: number;
    /** Sign-ups of each UTC day, `YYYY-MM-DD`, oldest first. */
    signups: { date: string; count: number }[];
    /** Sign-ups of the period before, to compare. */
    previousSignups: number;
  };
  follows: { accepted: number; pending: number };
  activities: {
    total: number;
    /** Activities first synchronized each UTC day, per family of sports. */
    synced: { date: string; families: Record<AdminSportFamily, number> }[];
  };
  stravaUsage: {
    /** Daily quota of each UTC day. */
    days: AdminStravaUsagePoint[];
    /** Short quota of each quarter of the last 24 hours. */
    quarters: AdminStravaUsagePoint[];
  };
  notifications: { read: number; unread: number };
}

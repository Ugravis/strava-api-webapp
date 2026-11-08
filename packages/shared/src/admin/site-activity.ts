import type { PageViewDevice } from "../site-activity";

/** Days the site activity can cover: page views are kept 90 days. */
export const ADMIN_SITE_ACTIVITY_PERIODS = [7, 30, 90] as const;

export type AdminSiteActivityPeriod = (typeof ADMIN_SITE_ACTIVITY_PERIODS)[number];

/** Parts of the site activity, one endpoint each: `GET /api/admin/site-activity/:section`. */
export const ADMIN_SITE_ACTIVITY_SECTIONS = ["overview", "users", "pages", "sessions", "params", "funnel"] as const;

export type AdminSiteActivitySection = (typeof ADMIN_SITE_ACTIVITY_SECTIONS)[number];

/** Ranges of days since the latest activity of a user; `never` for no activity recorded. */
export const ADMIN_DORMANCY_BUCKETS = ["0-6", "7-13", "14-29", "30-89", "90+", "never"] as const;

export type AdminDormancyBucket = (typeof ADMIN_DORMANCY_BUCKETS)[number];

/** Ranges of the visible time of a page view or of a session. */
export const ADMIN_DURATION_BUCKETS = ["<5s", "5-15s", "15-30s", "30-60s", "1-3min", "3-10min", "10-30min", "30min+"] as const;

export type AdminDurationBucket = (typeof ADMIN_DURATION_BUCKETS)[number];

/** Groups of users compared on their activity. */
export const ADMIN_USER_SEGMENTS = ["strava", "noStrava", "google", "password", "privateProfile", "publicProfile", "team"] as const;

export type AdminUserSegment = (typeof ADMIN_USER_SEGMENTS)[number];

/** Users back after their sign-up, among those signed up long enough ago. */
export interface AdminRetention {
  retained: number;
  eligible: number;
}

/** A count per value of a whole number: days, pages, sessions… */
export interface AdminHistogramBin {
  value: number;
  count: number;
}

/** Common to every section. Days and hours in UTC. */
export interface AdminSiteActivityMeta {
  generatedAt: string;
  days: AdminSiteActivityPeriod;
  /** Whether the members of the back-office team are counted. */
  team: boolean;
  /** Whether the views of the back-office pages are counted: the figures of the users never filter them. */
  admin: boolean;
  /** First day with an activity recorded, `YYYY-MM-DD`; null before any. */
  trackedSince: string | null;
  /** Each day of the period, `YYYY-MM-DD`, oldest first: the axis of the daily series. */
  dates: string[];
}

/** Figures of a period, compared with the period before. */
export interface AdminSiteActivityTotals {
  activeUsers: number;
  newUsers: number;
  views: number;
  sessions: number;
  visibleMs: number;
}

export interface AdminSiteActivityOverview extends AdminSiteActivityMeta {
  users: number;
  current: AdminSiteActivityTotals;
  previous: AdminSiteActivityTotals;
  /** Average of the daily DAU / MAU over the period; null without activity. */
  stickiness: number | null;
  averageSessionMs: number | null;
  pagesPerSession: number | null;
  /** Share of the sessions of a single page. */
  bounceRate: number | null;
}

export interface AdminSiteActivityUsers extends AdminSiteActivityMeta {
  /** Each day: users active that day, over 7 and over 30 days. */
  activeUsers: { date: string; dau: number; wau: number; mau: number }[];
  /** Active users of each day, split by whether they signed up that day. */
  newVsReturning: { date: string; new: number; returning: number }[];
  /**
   * Last 12 weeks, `week` its Monday: active users split into new, retained
   * from the week before and resurrected; churned, those of the week before
   * not seen back.
   */
  weekly: { week: string; active: number; new: number; retained: number; resurrected: number; churned: number }[];
  /** Last 12 months: active users and their average active days. */
  monthly: { month: string; users: number; averageDays: number }[];
  /** Users per number of active days within the period. */
  activeDaysInPeriod: AdminHistogramBin[];
  /** For each of the last 3 months: users per number of active days. */
  activeDays: { month: string; distribution: AdminHistogramBin[] }[];
  /** Weekly sign-up cohorts since the tracking began: back exactly on day 1, 7, 30, then during each of the 8 next weeks. */
  retention: { week: string; size: number; d1: AdminRetention; d7: AdminRetention; d30: AdminRetention; weeks: AdminRetention[] }[];
  /** Days 0 to 30 after the sign-up, every cohort together: back that very day (classic) or that day or later (rolling). */
  retentionCurve: { day: number; classic: AdminRetention; rolling: AdminRetention }[];
  dormancy: { bucket: AdminDormancyBucket; users: number }[];
  /** Users per longest run of consecutive active days, ever. */
  streaks: AdminHistogramBin[];
  segments: { segment: AdminUserSegment; total: number; active: number }[];
  /** Null for no country given. */
  countries: { country: string | null; total: number; active: number }[];
}

export interface AdminSiteActivityPages extends AdminSiteActivityMeta {
  /** Users active within the period, for the reach of the pages. */
  activeUsers: number;
  daily: { date: string; views: number; viewers: number; visibleMs: number }[];
  /** Pages of the period by views; times among the views with a visible time. */
  pages: { path: string; views: number; users: number; totalMs: number; averageMs: number | null; medianMs: number | null }[];
  /** Daily views of the 5 most viewed pages, one value per date. */
  trends: { path: string; values: number[] }[];
  /** Views per ISO weekday (1 Monday) and hour: every cell of the week. */
  heatmap: { weekday: number; hour: number; views: number }[];
  durations: { bucket: AdminDurationBucket; views: number }[];
  devices: { device: PageViewDevice; views: number; users: number; visibleMs: number }[];
  devicesDaily: { date: string; mobile: number; tablet: number; desktop: number }[];
  /** Users per number of kinds of device they used. */
  multiDevice: AdminHistogramBin[];
  /** The site itself and the back office. */
  areas: { area: "app" | "admin"; views: number; users: number; visibleMs: number }[];
}

export interface AdminSiteActivitySessions extends AdminSiteActivityMeta {
  /** A session ends after 30 minutes without a page opened. */
  gapMinutes: number;
  daily: { date: string; sessions: number; users: number }[];
  lengths: { bucket: AdminDurationBucket; sessions: number }[];
  /** Sessions per number of pages viewed. */
  pages: AdminHistogramBin[];
  /** Users per number of sessions in the period. */
  perUser: AdminHistogramBin[];
  /** First and last pages of the sessions. */
  entries: { path: string; sessions: number }[];
  exits: { path: string; sessions: number }[];
  /** From a page to the next one within a session. */
  transitions: { from: string; to: string; count: number }[];
}

export interface AdminSiteActivityParams extends AdminSiteActivityMeta {
  /** Query parameters per page: views where they appeared, their share of the views of the page, time spent with them. */
  keys: { path: string; key: string; views: number; users: number; share: number; visibleMs: number; distinctValues: number }[];
  /** Values of the parameters, those of an id (tile, activity, station…) gathered as `[id]`. */
  values: { path: string; key: string; value: string; views: number; users: number; visibleMs: number }[];
  /** Whole query strings, `""` for none. */
  queries: { path: string; query: string; views: number; users: number; visibleMs: number }[];
}

export interface AdminSiteActivityFunnelSteps {
  signedUp: number;
  stravaConnected: number;
  firstSync: number;
  mapVisited: number;
}

export interface AdminSiteActivityFunnel extends AdminSiteActivityMeta {
  /** All the users, whenever they signed up. */
  steps: AdminSiteActivityFunnelSteps;
  /** Median days from the sign-up to each step, among those who reached it. */
  medianDays: { stravaConnected: number | null; firstSync: number | null; mapVisited: number | null };
  /** Last 12 weekly sign-up cohorts. */
  cohorts: ({ week: string } & AdminSiteActivityFunnelSteps)[];
}

export interface AdminSiteActivityResponses {
  overview: AdminSiteActivityOverview;
  users: AdminSiteActivityUsers;
  pages: AdminSiteActivityPages;
  sessions: AdminSiteActivitySessions;
  params: AdminSiteActivityParams;
  funnel: AdminSiteActivityFunnel;
}

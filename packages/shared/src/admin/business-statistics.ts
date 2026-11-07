import type { AdminSportFamily, AdminStravaUsagePoint } from "./statistics";

/** Periods of the business statistics; `all` starts from the first figure of each series. */
export const ADMIN_BUSINESS_PERIODS = ["30", "90", "365", "all"] as const;

export type AdminBusinessPeriod = (typeof ADMIN_BUSINESS_PERIODS)[number];

/** Parts of the business statistics, one endpoint each: `GET /api/admin/business-statistics/:section`. */
export const ADMIN_BUSINESS_SECTIONS = ["overview", "accounts", "sports", "exploration", "community", "strava"] as const;

export type AdminBusinessSection = (typeof ADMIN_BUSINESS_SECTIONS)[number];

/** How long a point of a series lasts, from the length of the period. */
export type AdminBusinessUnit = "day" | "week" | "month" | "year";

/** Ranges of the distance of an activity, in kilometers. */
export const ADMIN_DISTANCE_BUCKETS = ["<5", "5-10", "10-25", "25-50", "50-100", "100-200", "200+"] as const;

/** Ranges of the activities of an athlete over the period. */
export const ADMIN_ATHLETE_LOAD_BUCKETS = ["1", "2-4", "5-9", "10-19", "20-49", "50+"] as const;

/** Ranges of days since the latest activity of an account; `never` for none. */
export const ADMIN_RECENCY_BUCKETS = ["0-6", "7-29", "30-89", "90-364", "365+", "never"] as const;

/** Ranges of the large tiles of an explorer. */
export const ADMIN_TILE_BUCKETS = ["1-99", "100-499", "500-1999", "2000-9999", "10000+"] as const;

/** Ranges of the followers of an account. */
export const ADMIN_FOLLOWER_BUCKETS = ["0", "1", "2-4", "5-9", "10+"] as const;

/** A range of a distribution, in the order of its constant. */
export interface AdminBusinessBucket {
  bucket: string;
  count: number;
}

/** What every section answers with. */
export interface AdminBusinessMeta {
  generatedAt: string;
  period: AdminBusinessPeriod;
  team: boolean;
  unit: AdminBusinessUnit;
  /** UTC start of each point of the series of the section, `YYYY-MM-DD`, oldest first. */
  buckets: string[];
}

/** Figures of a period; `previous` is null for the whole history. */
export interface AdminBusinessFigure {
  current: number;
  previous: number | null;
}

export interface AdminBusinessOverview extends AdminBusinessMeta {
  /** Accounts today, whatever the period. */
  accounts: number;
  /** Accounts linked to Strava today. */
  connected: number;
  newAccounts: AdminBusinessFigure;
  /** Accounts with an activity started in the period. */
  athletes: AdminBusinessFigure;
  activities: AdminBusinessFigure;
  distanceM: AdminBusinessFigure;
  movingS: AdminBusinessFigure;
  elevationM: AdminBusinessFigure;
  /** Large tiles discovered by each athlete, added up. */
  discoveries: AdminBusinessFigure;
  series: { accounts: number[]; athletes: number[]; activities: number[]; distanceM: number[] };
}

export interface AdminBusinessAccounts extends AdminBusinessMeta {
  /** Accounts before the first point of the series. */
  accountsBefore: number;
  /** New accounts per point, by how they signed up. */
  signups: { email: number; google: number }[];
  /** Accounts created in the period having reached each step, each counted on its own. */
  activation: { signedUp: number; connected: number; imported: number; explored: number; regular: number; social: number };
  /** Median days from the sign-up to the Strava link, of those of the period; null without any. */
  medianDaysToConnect: number | null;
  /** Accounts today with each field of the profile filled in. */
  profile: { total: number; avatar: number; bio: number; city: number; country: number; sports: number; color: number };
  status: { active: number; suspended: number; team: number };
  /** Accounts per declared country, most first, `null` for none declared. */
  countries: { country: string | null; count: number }[];
  /** Accounts per favorite sport, most first. */
  favoriteSports: { sport: string; count: number }[];
  /** Accounts per tag, most first. */
  tags: { name: string; count: number }[];
  /** Accounts by the age of their latest activity. */
  recency: AdminBusinessBucket[];
}

export interface AdminBusinessSports extends AdminBusinessMeta {
  /** Per point, per family. */
  activities: Record<AdminSportFamily, number>[];
  distanceM: Record<AdminSportFamily, number>[];
  /** Athletes with an activity on each point. */
  athletes: number[];
  totals: { activities: number; athletes: number; distanceM: number; movingS: number; elevationM: number; medianDistanceM: number | null };
  /** Per sport, most practiced first. */
  sports: { sport: string; activities: number; athletes: number; distanceM: number; movingS: number; elevationM: number }[];
  /** Activities per weekday (1 Monday) and hour, in the time zone of each activity. */
  week: { weekday: number; hour: number; views: number }[];
  distances: AdminBusinessBucket[];
  /** Athletes by their activities of the period. */
  load: AdminBusinessBucket[];
  kinds: { outdoor: number; indoor: number; manual: number };
}

export interface AdminBusinessExploration extends AdminBusinessMeta {
  /** What the counted users explored today, each tile, station or link counted once. */
  totals: {
    explorers: number;
    tiles: number;
    smallTiles: number;
    stations: number;
    stationsImported: number;
    railwayM: number;
    railwayImportedM: number;
    countries: number;
  };
  /** Per point: tiles new to their athlete, added up, and tiles new to the whole community. */
  discoveries: { individual: number; community: number; smallTiles: number }[];
  /** Explorers by their large tiles. */
  explorers: AdminBusinessBucket[];
  /** Medians over the explorers; null while their metrics are not computed. */
  medians: { tiles: number | null; maxSquare: number | null; maxCluster: number | null };
  /** The most explored countries, most tiles first. */
  countries: { country: string; tiles: number; explorers: number; totalTiles: number | null }[];
}

export interface AdminBusinessCommunity extends AdminBusinessMeta {
  follows: {
    accepted: number;
    pending: number;
    /** Pairs of accounts following each other. */
    mutualPairs: number;
    /** Accounts following or followed by someone. */
    connectedAccounts: number;
  };
  accounts: number;
  profiles: { private: number; public: number };
  /** Per point. */
  growth: { follows: number; likes: number }[];
  likes: AdminBusinessFigure;
  followers: AdminBusinessBucket[];
  /** Notifications sent in the period, per type, most first. */
  notifications: { type: string; sent: number; read: number }[];
  badges: {
    active: number;
    athletes: number;
    /** Athletes having reached each badge at least once, most reached first. */
    earned: { id: string; name: string; count: number }[];
    /** Accounts per favorite badge, most first. */
    favorites: { id: string; name: string; count: number }[];
    /** Accounts per badge shown on their profile, most first. */
    pinned: { id: string; name: string; count: number }[];
  };
}

export interface AdminBusinessStrava extends AdminBusinessMeta {
  connections: {
    accounts: number;
    connected: number;
    /** Linked but never synchronized. */
    neverSynced: number;
    /** Synchronized in the last 7 days. */
    fresh: number;
    /** Links granting the private activities. */
    privateScope: number;
  };
  /** Per point. */
  imports: { connections: number; activities: number }[];
  jobs: {
    completed: number;
    failed: number;
    /** Waiting or running now, whatever the period. */
    active: number;
    medianDurationS: number | null;
    /** Failures per error, most first. */
    errors: { code: string; count: number }[];
    /** Per point. */
    series: { completed: number; failed: number }[];
  };
  webhooks: {
    received: number;
    medianDelayS: number | null;
    /** Waiting now, whatever the period. */
    pending: number;
    /** Waiting now after an error. */
    failing: number;
    /** Per point, per action. */
    series: { create: number; update: number; delete: number }[];
  };
  /** Read quota of each UTC day of the last 30 days, and of each quarter of the last 24 hours. */
  usage: { days: AdminStravaUsagePoint[]; quarters: AdminStravaUsagePoint[] };
}

export interface AdminBusinessResponses {
  overview: AdminBusinessOverview;
  accounts: AdminBusinessAccounts;
  sports: AdminBusinessSports;
  exploration: AdminBusinessExploration;
  community: AdminBusinessCommunity;
  strava: AdminBusinessStrava;
}

export interface User {
  id: string;
  email: string;
  username: string;
  /** Optional: use `publicNameOf` to display a user. */
  displayName: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export interface PendingGoogleSignup {
  email: string;
  suggestedUsername: string;
}

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: "invalid" | "reserved" | "taken" };

export type SyncJobStatus = "queued" | "running" | "completed" | "failed";

export interface SyncJob {
  kind: "backfill" | "reconcile";
  status: SyncJobStatus;
  processed: number;
  /** Known once the import is over. */
  total: number | null;
  /** Set while the job waits for the Strava quota or a retry. */
  waitingUntil: string | null;
  errorCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StravaConnectionStatus {
  /** False when Strava is not configured on the server. */
  available: boolean;
  connection: {
    accountName: string | null;
    privateActivitiesGranted: boolean;
    connectedAt: string;
    lastSyncedAt: string | null;
  } | null;
  sync: SyncJob | null;
  /** Tile computation of the imported activities; null without connection. */
  tiles: TileProgress | null;
}

export interface TileProgress {
  activities: number;
  /** Activities whose tiles are computed, at least from the simplified track. */
  computed: number;
  /** Activities awaiting their full track to refine their tiles. */
  refining: number;
}

export interface ActivityStats {
  count: number;
  totalDistanceM: number;
  totalElevationGainM: number;
  totalMovingTimeS: number;
}

/** Groups of sports compared to landmarks; `all` counts every activity. */
export type DistanceFamily = "all" | "run" | "hike" | "ride";

/** A known distance compared to the cumulated distance of a family, with the progress of the user. */
export interface DistanceBadge {
  id: string;
  family: DistanceFamily;
  distanceM: number;
  name: string;
  description: string;
  /** Icon key; unknown keys get a generic icon. */
  icon: string;
  /** Number of times the whole distance was covered. */
  completions: number;
  /** Share of the current iteration already covered, in [0, 1). */
  progress: number;
  /** Start of the activity that completed the first iteration. */
  firstCompletedAt: string | null;
  /** Start of the activity that completed the latest iteration. */
  lastCompletedAt: string | null;
  /** Rank among the pinned badges, from 1; null when not pinned. */
  pinPosition: number | null;
}

export interface DistancesOverview {
  /** Cumulated distance per family, in meters. */
  totals: Record<DistanceFamily, number>;
  /** Every badge, in display order. */
  badges: DistanceBadge[];
}

export interface BadgeCompletion {
  /** Iteration completed, from 1. */
  iteration: number;
  /** The activity whose distance completed it. */
  activity: { id: string; name: string; sportType: string; startedAt: string };
}

export interface DistanceBadgeDetails extends DistanceBadge {
  /** Distance covered by the family of the badge, in meters. */
  familyTotalM: number;
  /** Distance left before the next iteration, in meters. */
  remainingM: number;
  /** At the pace of the last 90 days; null without recent activity. */
  estimatedNextAt: string | null;
  /** Every completed iteration, the latest first. */
  history: BadgeCompletion[];
}

/** Activity expected to have a real-world track. */
export interface MappableActivity {
  id: string;
  startedAt: string;
}

export interface ActivityTracksPage {
  tracks: {
    activityId: string;
    /** Google encoded polyline, or null when the activity has no GPS track. */
    polyline: string | null;
  }[];
  /** True when a further page may hold more tracks. */
  hasMore: boolean;
}

export interface TileLevelStats {
  /** Tiles crossed at least once. */
  visited: number;
  /** Side of the largest square of visited tiles. */
  maxSquare: number;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  /** Visited tiles whose four neighbors are visited too. */
  clustered: number;
}

export interface TileStats {
  /** Large tiles (zoom 14). */
  tiles: TileLevelStats;
  /** Small tiles (zoom 17). */
  subtiles: TileLevelStats;
}

/** Top-left tile and side of a square made of visited tiles. */
export interface TileSquare {
  x: number;
  y: number;
  size: number;
}

/** Counters and achievements of one level of tiles. */
export interface TileLevelSummary {
  /** Tiles crossed at least once. */
  visited: number;
  /** Largest square of visited tiles; null without tiles. */
  maxSquare: TileSquare | null;
  /** Tiles of the largest cluster. */
  maxCluster: number;
  /** Visited tiles whose four neighbors are visited too. */
  clustered: number;
}

export interface TilesSummary {
  /** Changes whenever the tiles change: the vector tiles of the map are cached until it does. */
  version: string;
  /** False while the achievements of the latest tiles are being computed. */
  upToDate: boolean;
  /** Large tiles (zoom 14). */
  tiles: TileLevelSummary;
  /** Small tiles (zoom 17). */
  subtiles: TileLevelSummary;
}

/** What the map shows about one tile, at the level of its zoom. */
export interface TileDetails {
  visited: boolean;
  /** Small tiles explored inside a large tile; null for a small tile. */
  subtiles: number | null;
  /** Its four neighbors are visited too. */
  clustered: boolean;
  inMaxCluster: boolean;
  inMaxSquare: boolean;
}

/** Activities that crossed one tile. */
export interface TileVisits {
  activities: number;
  firstVisitedAt: string | null;
  lastVisitedAt: string | null;
  tile: TileDetails;
}

/** An activity that crossed a tile. */
export interface TileActivity {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  distanceM: number;
  movingTimeS: number;
  elevationGainM: number | null;
  /** Identifier of the activity on Strava, to link to it. */
  stravaId: string | null;
}

/** An activity of the user, as shown on its own. */
export interface ActivityDetails {
  id: string;
  name: string;
  sportType: string;
  startedAt: string;
  /** IANA time zone of the start. */
  timezone: string | null;
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  elevationGainM: number | null;
  /** Identifier of the activity on Strava, to link to it. */
  stravaId: string | null;
}

/** What an activity brought to one level of tiles when it was recorded. */
export interface LevelGains {
  /** Tiles no earlier activity had crossed, as `[x, y]` pairs. */
  gained: [number, number][];
  /** Growth of the side of the largest square. */
  maxSquare: number;
  /** Growth of the largest cluster. */
  maxCluster: number;
  /** Tiles that became cluster tiles outside of the largest cluster. */
  otherClusters: number;
}

/** Tiles crossed by one activity, as `[x, y]` pairs of each level. */
export interface ActivityTiles {
  /** Large tiles (zoom 14). */
  tiles: [number, number][];
  /** Small tiles (zoom 17). */
  subtiles: [number, number][];
  /** What the activity brought when it was recorded; null until computed. */
  gains: { tiles: LevelGains; subtiles: LevelGains } | null;
}

/** A page of the activities that crossed a tile, the latest ones first. */
export interface TileActivitiesPage {
  items: TileActivity[];
  /** Cursor of the next page; null on the last one. */
  next: string | null;
}

/** Tiles of one level touching a country, and those visited. */
export interface CountryLevelCompletion {
  visited: number;
  /** Null while the total is being computed. */
  total: number | null;
}

/** Completion of a country visited by the user. */
export interface CountryCompletion {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: CountryLevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: CountryLevelCompletion;
}

export interface CountriesCompletion {
  /** Most visited first. */
  countries: CountryCompletion[];
  /** Visited large tiles whose countries are not known yet. */
  pendingTiles: number;
  /** Changes with the shapes of the countries drawn on the map; null without shapes. */
  shapesVersion: string | null;
}

/** A country seen as a sector of the map: the tiles of the user in it and its visits. */
export interface CountrySector {
  /** ISO 3166-1 alpha-2 code. */
  code: string;
  /** Large tiles (zoom 14). */
  tiles: CountryLevelCompletion;
  /** Small tiles (zoom 17). */
  subtiles: CountryLevelCompletion;
  /** Start of the first activity that gained a small tile in it, ISO 8601; null without any. */
  firstVisitAt: string | null;
  /** Start of the latest activity that crossed it, ISO 8601; null without any. */
  lastVisitAt: string | null;
  /** Main landmass, `[west, south, east, north]` in degrees; null without land. */
  bounds: [number, number, number, number] | null;
  /** Changes with its tile shape, which dims the rest of the map; null while it is being computed. */
  shapeVersion: string | null;
}

/** Which tiles the history shows: those first visited since a date, or the map as it was at that date. */
export type HistoryMode = "gained" | "state";

/** Tiles of the history at a date. */
export interface TileHistorySummary {
  /** Version of the tiles whose first visits are known: the map tiles of the history change with it. Null until known. */
  version: string | null;
  /** False while the first visits of the latest tiles are being computed. */
  upToDate: boolean;
  /** Start of the first activity that crossed a tile, ISO 8601; null without tiles. */
  firstVisitAt: string | null;
  /** Large tiles (zoom 14) gained since the date, or visited before it. */
  tiles: number;
  /** Small tiles (zoom 17) gained since the date, or visited before it. */
  subtiles: number;
}

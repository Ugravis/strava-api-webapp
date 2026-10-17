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

export interface LandmarkProgress {
  id: string;
  family: DistanceFamily;
  distanceM: number;
  /** Number of times the whole distance was covered. */
  completions: number;
  /** Share of the current iteration already covered, in [0, 1). */
  progress: number;
}

export interface DistancesOverview {
  /** Cumulated distance per family, in meters. */
  totals: Record<DistanceFamily, number>;
  landmarks: LandmarkProgress[];
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

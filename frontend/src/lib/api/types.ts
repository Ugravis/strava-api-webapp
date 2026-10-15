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

export interface TileStats {
  /** Large tiles (zoom 14) crossed at least once. */
  tiles: number;
  /** Small tiles (zoom 17) crossed at least once. */
  subtiles: number;
}

export interface TilesResponse {
  /** `[x, y, mask]`: a large tile (zoom 14) and its small tiles as an unsigned 64-bit decimal mask. */
  cells: [number, number, string][];
}

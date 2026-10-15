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
}

export interface ActivityStats {
  count: number;
  totalDistanceM: number;
}

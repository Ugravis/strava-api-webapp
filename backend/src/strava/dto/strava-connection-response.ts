import type { ProviderConnection } from '../../connections/provider-connection.entity';
import type {
  SyncJob,
  SyncJobKind,
  SyncJobStatus,
} from '../../connections/sync-job.entity';

export interface SyncJobResponse {
  kind: SyncJobKind;
  status: SyncJobStatus;
  processed: number;
  total: number | null;
  /** Set while the job waits for the Strava quota or a retry. */
  waitingUntil: string | null;
  errorCode: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StravaConnectionResponse {
  /** False when the Strava API credentials are not configured. */
  available: boolean;
  connection: {
    accountName: string | null;
    /** False when the user unchecked the private activities scope. */
    privateActivitiesGranted: boolean;
    connectedAt: string;
    lastSyncedAt: string | null;
  } | null;
  sync: SyncJobResponse | null;
}

function toSyncJobResponse(job: SyncJob): SyncJobResponse {
  const waiting =
    job.status === 'queued' && job.runAfter.getTime() > Date.now();
  return {
    kind: job.kind,
    status: job.status,
    processed: job.processed,
    total: job.total,
    waitingUntil: waiting ? job.runAfter.toISOString() : null,
    errorCode: job.errorCode,
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

export function toStravaConnectionResponse(
  available: boolean,
  connection: ProviderConnection | null,
  job: SyncJob | null,
): StravaConnectionResponse {
  return {
    available,
    connection: connection && {
      accountName: connection.accountName,
      privateActivitiesGranted: connection.scopes.includes('activity:read_all'),
      connectedAt: connection.createdAt.toISOString(),
      lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    },
    sync: connection && job ? toSyncJobResponse(job) : null,
  };
}

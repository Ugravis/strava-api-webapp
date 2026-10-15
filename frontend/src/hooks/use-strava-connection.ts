"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTrackSyncManager } from "@/components/tracks/track-sync-provider";
import type { StravaConnectionStatus, SyncJob } from "@/lib/api/types";
import { stravaService } from "@/services/strava.service";

const POLL_INTERVAL_MS = 2_000;
/** Slower polling while the job waits for the Strava quota (up to 15 minutes). */
const WAITING_POLL_INTERVAL_MS = 15_000;

export function isSyncActive(sync: SyncJob | null | undefined): boolean {
  return sync?.status === "queued" || sync?.status === "running";
}

export interface StravaConnectionState {
  /** Null until the first response. */
  status: StravaConnectionStatus | null;
  error: boolean;
  refresh: () => Promise<void>;
  /** Replaces the state with a response already received (e.g. after a mutation). */
  update: (status: StravaConnectionStatus) => void;
}

/** Strava connection and synchronization state, polled while a sync is in progress. */
export function useStravaConnection(): StravaConnectionState {
  const [status, setStatus] = useState<StravaConnectionStatus | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(
    () =>
      stravaService.getStatus().then(
        (next) => {
          setStatus(next);
          setError(false);
        },
        () => setError(true),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    stravaService.getStatus().then(
      (next) => {
        if (!cancelled) setStatus(next);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const sync = status?.sync;
  const active = isSyncActive(sync);
  const interval = sync?.waitingUntil ? WAITING_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [active, interval, refresh]);

  // Tracks follow the activity import: once a sync ends, the new ones are fetched.
  const trackSync = useTrackSyncManager();
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) void trackSync.sync();
    wasActive.current = active;
  }, [active, trackSync]);

  return { status, error, refresh, update: setStatus };
}

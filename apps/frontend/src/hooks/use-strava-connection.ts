"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTrackSyncManager } from "@/components/tracks/track-sync-provider";
import type { StravaConnectionStatus, SyncJob, TileProgress } from "@/lib/api/types";
import { stravaService } from "@/services/strava.service";

const POLL_INTERVAL_MS = 2_000;
/** Slower polling while the job waits for the Strava quota (up to 15 minutes). */
const WAITING_POLL_INTERVAL_MS = 15_000;
/** The tile refinement runs at the pace the Strava quota allows, possibly for hours. */
const TILES_POLL_INTERVAL_MS = 10_000;

export function isSyncActive(sync: SyncJob | null | undefined): boolean {
  return sync?.status === "queued" || sync?.status === "running";
}

/** Tiles still computed or refined in the background. */
export function isTileWorkPending(tiles: TileProgress | null | undefined): boolean {
  return !!tiles && (tiles.computed < tiles.activities || tiles.refining > 0);
}

export interface StravaConnectionState {
  /** Null until the first response. */
  status: StravaConnectionStatus | null;
  error: boolean;
  refresh: () => Promise<void>;
  /** Replaces the state with a response already received (e.g. after a mutation). */
  update: (status: StravaConnectionStatus) => void;
}

/** Strava connection and synchronization state, polled while a sync or the tile computation is in progress. */
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
  const tilesPending = isTileWorkPending(status?.tiles);
  const interval = sync?.waitingUntil
    ? WAITING_POLL_INTERVAL_MS
    : active
      ? POLL_INTERVAL_MS
      : TILES_POLL_INTERVAL_MS;
  useEffect(() => {
    if (!active && !tilesPending) return;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [active, tilesPending, interval, refresh]);

  // Tracks follow the activity import: once a sync ends, the new ones are fetched.
  const trackSync = useTrackSyncManager();
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) void trackSync.sync();
    wasActive.current = active;
  }, [active, trackSync]);

  return { status, error, refresh, update: setStatus };
}

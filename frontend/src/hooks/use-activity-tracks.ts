"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import { decodePolyline, type LngLat } from "@/lib/tracks/polyline";
import { MemoryTrackStore, openTrackStore, type TrackStore } from "@/lib/tracks/track-store";
import { syncTracks, type TrackSyncProgress } from "@/lib/tracks/track-sync";
import { tracksService } from "@/services/tracks.service";

export interface TrackLine {
  activityId: string;
  coordinates: LngLat[];
}

export type ActivityTracksStatus = "loading" | "syncing" | "ready" | "error";

export interface ActivityTracksState {
  /** Null until the local tracks are read. */
  lines: TrackLine[] | null;
  status: ActivityTracksStatus;
  /** Set while missing tracks are fetched. */
  progress: TrackSyncProgress | null;
  errorCode: ApiErrorCode | null;
  retry: () => void;
}

async function readLines(store: TrackStore): Promise<TrackLine[]> {
  const tracks = await store.all();
  return tracks.flatMap(({ activityId, polyline }) => {
    const coordinates = polyline ? decodePolyline(polyline) : [];
    return coordinates.length > 1 ? [{ activityId, coordinates }] : [];
  });
}

/**
 * Tracks of the current user: the ones kept in the browser are shown at
 * once, then the missing ones are fetched.
 */
export function useActivityTracks(): ActivityTracksState {
  const user = useCurrentUser();
  const [lines, setLines] = useState<TrackLine[] | null>(null);
  const [status, setStatus] = useState<ActivityTracksStatus>("loading");
  const [progress, setProgress] = useState<TrackSyncProgress | null>(null);
  const [errorCode, setErrorCode] = useState<ApiErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const store = await openTrackStore(user.id).catch(() => new MemoryTrackStore());
      const local = await readLines(store);
      if (cancelled) return;
      setLines(local);
      setStatus("syncing");

      const changed = await syncTracks(store, tracksService, (next) => {
        if (!cancelled) setProgress(next);
      });
      const synced = changed ? await readLines(store) : null;
      if (cancelled) return;
      if (synced) setLines(synced);
      setProgress(null);
      setStatus("ready");
    }

    load().catch((failure: unknown) => {
      if (cancelled) return;
      setLines((current) => current ?? []);
      setProgress(null);
      setErrorCode(errorCodeOf(failure));
      setStatus("error");
    });
    return () => {
      cancelled = true;
    };
  }, [user.id, attempt]);

  const retry = useCallback(() => {
    setErrorCode(null);
    setStatus("syncing");
    setAttempt((value) => value + 1);
  }, []);

  return { lines, status, progress, errorCode, retry };
}

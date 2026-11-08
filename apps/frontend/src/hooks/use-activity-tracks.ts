"use client";

import { useEffect, useState } from "react";
import { useTrackSync, useTrackSyncManager } from "@/components/tracks/track-sync-provider";
import { decodePolyline, type LngLat } from "@/lib/tracks/polyline";
import type { TrackStore } from "@/lib/tracks/track-store";
import type { TrackSyncSnapshot } from "@/lib/tracks/track-sync-manager";

export interface TrackLine {
  activityId: string;
  coordinates: LngLat[];
}

export interface ActivityTracksState extends TrackSyncSnapshot {
  /** Null until the local tracks are read. */
  lines: TrackLine[] | null;
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
 * Tracks of the current user, read from the browser and read again whenever
 * the background synchronization changes them.
 */
export function useActivityTracks(): ActivityTracksState {
  const manager = useTrackSyncManager();
  const snapshot = useTrackSync();
  const [lines, setLines] = useState<TrackLine[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    manager
      .getStore()
      .then(readLines)
      .then(
        (next) => {
          if (!cancelled) setLines(next);
        },
        () => {
          if (!cancelled) setLines((current) => current ?? []);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [manager, snapshot.version]);

  return { ...snapshot, lines, retry: () => void manager.sync() };
}

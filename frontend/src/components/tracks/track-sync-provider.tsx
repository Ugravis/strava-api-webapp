"use client";

import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { TrackSyncManager, type TrackSyncSnapshot } from "@/lib/tracks/track-sync-manager";
import { tracksService } from "@/services/tracks.service";

const TrackSyncContext = createContext<TrackSyncManager | null>(null);

/**
 * Synchronizes the activity tracks in the background as soon as the app is
 * opened, whatever the page: the map then reads them from the browser.
 */
export function TrackSyncProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [manager] = useState(() => new TrackSyncManager(userId, tracksService));

  useEffect(() => {
    void manager.sync();
  }, [manager]);

  return <TrackSyncContext value={manager}>{children}</TrackSyncContext>;
}

export function useTrackSyncManager(): TrackSyncManager {
  const manager = use(TrackSyncContext);
  if (!manager) {
    throw new Error("useTrackSyncManager must be used within a TrackSyncProvider");
  }
  return manager;
}

export function useTrackSync(): TrackSyncSnapshot {
  const manager = useTrackSyncManager();
  return useSyncExternalStore(manager.subscribe, manager.getSnapshot, manager.getSnapshot);
}

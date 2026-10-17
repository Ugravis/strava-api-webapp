"use client";

import { useEffect, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { type ExploredTiles, parseTiles } from "@/lib/tiles/tile-geometry";
import { tilesService } from "@/services/tiles.service";

/**
 * Tiles crossed by the current user. Fetched again when new tracks arrive,
 * that is once a synchronization brought new activities.
 */
export function useTiles(): { explored: ExploredTiles | null; error: boolean } {
  const { version } = useTrackSync();
  const [explored, setExplored] = useState<ExploredTiles | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tilesService.getTiles().then(
      (response) => {
        if (cancelled) return;
        setExplored(parseTiles(response));
        setError(false);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { explored, error };
}

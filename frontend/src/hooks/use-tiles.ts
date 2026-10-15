"use client";

import { useEffect, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { parseCells, type TileCell } from "@/lib/tiles/tile-geometry";
import { tilesService } from "@/services/tiles.service";

/**
 * Tiles crossed by the current user. Fetched again when new tracks arrive,
 * that is once a synchronization brought new activities.
 */
export function useTiles(): { cells: TileCell[] | null; error: boolean } {
  const { version } = useTrackSync();
  const [cells, setCells] = useState<TileCell[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tilesService.getTiles().then(
      (response) => {
        if (cancelled) return;
        setCells(parseCells(response.cells));
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

  return { cells, error };
}

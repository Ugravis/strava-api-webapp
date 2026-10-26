"use client";

import { useEffect, useState } from "react";
import type { TileStats } from "@/lib/api/types";
import { tilesService } from "@/services/tiles.service";

/** Tile counters of the current user, fetched again whenever `version` changes. */
export function useTileStats(version: string): { stats: TileStats | null; error: boolean } {
  const [stats, setStats] = useState<TileStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tilesService.getStats().then(
      (next) => {
        if (cancelled) return;
        setStats(next);
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

  return { stats, error };
}

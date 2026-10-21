"use client";

import { useEffect, useState } from "react";
import type { TileTimelineDay } from "@/lib/api/types";
import { tilesService } from "@/services/tiles.service";

/**
 * Gains of the tiles of the current user day by day, fetched again whenever
 * `version` changes (e.g. while the tiles are computed).
 */
export function useTileTimeline(version: string): { timeline: TileTimelineDay[] | null; error: boolean } {
  const [timeline, setTimeline] = useState<TileTimelineDay[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tilesService.getTimeline().then(
      (next) => {
        if (cancelled) return;
        setTimeline(next);
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

  return { timeline, error };
}

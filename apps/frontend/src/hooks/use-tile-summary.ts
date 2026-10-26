"use client";

import { useEffect, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { sharedRequest } from "@/lib/api/shared-request";
import type { TilesSummary } from "@/lib/api/types";
import { tilesService } from "@/services/tiles.service";

/** The backend computes the achievements in the background, a few seconds after the tiles change. */
const PENDING_POLL_MS = 3_000;

const fetchSummary = sharedRequest(() => tilesService.getSummary());

/**
 * Counters, achievements and version of the tiles of the current user.
 * Fetched again when new tracks arrive, and polled while the achievements
 * of the latest tiles are being computed.
 */
export function useTileSummary(): { summary: TilesSummary | null; error: boolean } {
  const { version } = useTrackSync();
  const [summary, setSummary] = useState<TilesSummary | null>(null);
  const [error, setError] = useState(false);
  const [poll, setPoll] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchSummary(`${version}/${poll}`).then(
      (next) => {
        if (cancelled) return;
        // Same version and state: the map keeps its sources untouched.
        setSummary((current) =>
          current && current.version === next.version && current.upToDate === next.upToDate ? current : next,
        );
        setError(false);
        if (!next.upToDate) timer = setTimeout(() => setPoll((count) => count + 1), PENDING_POLL_MS);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [version, poll]);

  return { summary, error };
}

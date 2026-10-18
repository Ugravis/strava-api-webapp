"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { VisitedStations } from "@/lib/api/types";
import { stationsService } from "@/services/stations.service";

/** The backend finds the links of the stations just visited in the background. */
const PENDING_POLL_MS = 10_000;

const fetchVisited = sharedRequest(stationsService.getVisited);

/**
 * Stations visited by the user and the links between them, fetched again
 * when the tiles change (`tilesVersion`), and polled while links are being
 * found.
 */
export function useStations(tilesVersion: string | null): { stations: VisitedStations | null; error: boolean } {
  const [stations, setStations] = useState<VisitedStations | null>(null);
  const [error, setError] = useState(false);
  const [poll, setPoll] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchVisited(`${tilesVersion}/${poll}`).then(
      (visited) => {
        if (cancelled) return;
        setStations(visited);
        setError(false);
        if (visited.pendingStations > 0) timer = setTimeout(() => setPoll((count) => count + 1), PENDING_POLL_MS);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tilesVersion, poll]);

  // The previous answer stays while the tiles change.
  return { stations, error: error && !stations };
}

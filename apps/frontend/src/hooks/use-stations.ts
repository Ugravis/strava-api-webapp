"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { VisitedStations } from "@/lib/api/types";
import { stationsService } from "@/services/stations.service";

const fetchVisited = sharedRequest(stationsService.getVisited);

/** Stations visited by the user and the links between them, fetched again when the tiles change (`tilesVersion`). */
export function useStations(tilesVersion: string | null): { stations: VisitedStations | null; error: boolean } {
  const [stations, setStations] = useState<VisitedStations | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVisited(String(tilesVersion)).then(
      (visited) => {
        if (cancelled) return;
        setStations(visited);
        setError(false);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tilesVersion]);

  // The previous answer stays while the tiles change.
  return { stations, error: error && !stations };
}

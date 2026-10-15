"use client";

import { useCallback, useEffect, useState } from "react";
import type { DistancesOverview } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

export interface DistancesState {
  /** Null until the first response. */
  overview: DistancesOverview | null;
  error: boolean;
  refresh: () => Promise<void>;
}

/** Cumulated distances of the current user compared to known landmarks. */
export function useDistances(): DistancesState {
  const [overview, setOverview] = useState<DistancesOverview | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(
    () =>
      distancesService.getOverview().then(
        (next) => {
          setOverview(next);
          setError(false);
        },
        () => setError(true),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    distancesService.getOverview().then(
      (next) => {
        if (!cancelled) setOverview(next);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return { overview, error, refresh };
}

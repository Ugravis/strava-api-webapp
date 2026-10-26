"use client";

import { useEffect, useState } from "react";
import type { ActivitiesOverview } from "@/lib/api/types";
import { activitiesService } from "@/services/activities.service";

/**
 * Latest activities, days of the last year and sports of the current user,
 * fetched again whenever `version` changes (e.g. while a synchronization
 * imports activities).
 */
export function useActivitiesOverview(version: string): { overview: ActivitiesOverview | null; error: boolean } {
  const [overview, setOverview] = useState<ActivitiesOverview | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activitiesService.getOverview().then(
      (next) => {
        if (cancelled) return;
        setOverview(next);
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

  return { overview, error };
}

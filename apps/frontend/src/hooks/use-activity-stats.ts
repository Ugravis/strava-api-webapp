"use client";

import { useEffect, useState } from "react";
import type { ActivityStats } from "@/lib/api/types";
import { activitiesService } from "@/services/activities.service";

/**
 * Activity totals of the current user, fetched again whenever `version`
 * changes (e.g. while a synchronization imports activities).
 */
export function useActivityStats(version: string): { stats: ActivityStats | null; error: boolean } {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activitiesService.getStats().then(
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

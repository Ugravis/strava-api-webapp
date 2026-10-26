"use client";

import { useEffect, useState } from "react";
import type { ActivityDay } from "@/lib/api/types";
import { activitiesService } from "@/services/activities.service";

/**
 * Days with activities of a calendar year, from the November before it,
 * fetched again whenever `year` or `version` changes. While another year
 * loads, the days of the previous one stay; null until the first ones.
 */
export function useYearDays(
  year: number,
  version: string,
): { loaded: { year: number; days: ActivityDay[] } | null; error: boolean } {
  const [loaded, setLoaded] = useState<{ year: number; days: ActivityDay[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activitiesService.getYearDays(year).then(
      (days) => {
        if (cancelled) return;
        setLoaded({ year, days });
        setError(false);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [year, version]);

  return { loaded, error };
}

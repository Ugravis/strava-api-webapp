"use client";

import { useEffect, useState } from "react";
import type { MonthDistance } from "@/lib/api/types";
import { activitiesService } from "@/services/activities.service";

/**
 * Distance of every month of the current user, fetched again whenever
 * `version` changes (e.g. while a synchronization imports activities).
 */
export function useMonthlyDistances(version: string): { months: MonthDistance[] | null; error: boolean } {
  const [months, setMonths] = useState<MonthDistance[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activitiesService.getMonthly().then(
      (next) => {
        if (cancelled) return;
        setMonths(next);
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

  return { months, error };
}

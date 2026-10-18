"use client";

import { useCallback, useEffect, useState } from "react";
import type { DistanceBadge, DistancesOverview } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

export interface DistancesState {
  /** Null until the first response. */
  overview: DistancesOverview | null;
  error: boolean;
  refresh: () => Promise<void>;
  /** Pins or unpins a badge at once, back as it was if the server refuses; rejects then. */
  setPinned: (badge: DistanceBadge, pinned: boolean) => Promise<void>;
}

/** Badges of the current user: cumulated distances compared to known distances. */
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

  const setPinned = useCallback(async ({ id, pinnedAt }: DistanceBadge, pinned: boolean) => {
    const show = (value: string | null) =>
      setOverview((current) =>
        current
          ? {
              ...current,
              badges: current.badges.map((badge) => (badge.id === id ? { ...badge, pinnedAt: value } : badge)),
            }
          : current,
      );
    show(pinned ? (pinnedAt ?? new Date().toISOString()) : null);
    try {
      await (pinned ? distancesService.pin(id) : distancesService.unpin(id));
    } catch (failure) {
      show(pinnedAt);
      throw failure;
    }
  }, []);

  return { overview, error, refresh, setPinned };
}

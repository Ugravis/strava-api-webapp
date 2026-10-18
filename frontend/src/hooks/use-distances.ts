"use client";

import { useCallback, useEffect, useState } from "react";
import type { DistanceBadge, DistancesOverview } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

export interface DistancesState {
  /** Null until the first response. */
  overview: DistancesOverview | null;
  error: boolean;
  refresh: () => Promise<void>;
  /** Pins a badge after the others, or unpins it, at once; back as it was and rejects if the server refuses. */
  setPinned: (badge: DistanceBadge, pinned: boolean) => Promise<void>;
  /** Ranks the pinned badges in the given order, at once; back as it was and rejects if the server refuses. */
  reorderPins: (badgeIds: string[]) => Promise<void>;
}

type PinPositions = Map<string, number | null>;

const pinPositionsOf = (overview: DistancesOverview | null): PinPositions =>
  new Map((overview?.badges ?? []).map((badge) => [badge.id, badge.pinPosition]));

/** Ranks from 1, in the order of `ids`. */
const rankedFrom = (ids: string[]): PinPositions => new Map(ids.map((id, index) => [id, index + 1]));

/** Pinned badges of the user, in their order. */
export function pinnedBadges(badges: DistanceBadge[]): DistanceBadge[] {
  return badges
    .filter((badge) => badge.pinPosition !== null)
    .sort((a, b) => (a.pinPosition ?? 0) - (b.pinPosition ?? 0));
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

  /** Shows the given ranks; badges left out are not pinned. */
  const showPins = useCallback((positions: PinPositions) => {
    setOverview((current) =>
      current
        ? {
            ...current,
            badges: current.badges.map((badge) => ({
              ...badge,
              pinPosition: positions.get(badge.id) ?? null,
            })),
          }
        : current,
    );
  }, []);

  const setPinned = useCallback(
    async (badge: DistanceBadge, pinned: boolean) => {
      const previous = pinPositionsOf(overview);
      const ids = pinnedBadges(overview?.badges ?? [])
        .map(({ id }) => id)
        .filter((id) => id !== badge.id);
      showPins(rankedFrom(pinned ? [...ids, badge.id] : ids));
      try {
        await (pinned ? distancesService.pin(badge.id) : distancesService.unpin(badge.id));
      } catch (failure) {
        showPins(previous);
        throw failure;
      }
    },
    [overview, showPins],
  );

  const reorderPins = useCallback(
    async (badgeIds: string[]) => {
      const previous = pinPositionsOf(overview);
      showPins(rankedFrom(badgeIds));
      try {
        await distancesService.reorderPins(badgeIds);
      } catch (failure) {
        showPins(previous);
        throw failure;
      }
    },
    [overview, showPins],
  );

  return { overview, error, refresh, setPinned, reorderPins };
}

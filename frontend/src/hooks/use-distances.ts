"use client";

import { useCallback, useEffect, useState } from "react";
import type { DistanceBadge, DistancesOverview } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

export interface DistancesState {
  /** Null until the first response. */
  overview: DistancesOverview | null;
  error: boolean;
  refresh: () => Promise<void>;
  /** Adds a badge to the favorites, last, or removes it, at once; back as it was and rejects if the server refuses. */
  setFavorite: (badge: DistanceBadge, favorite: boolean) => Promise<void>;
  /** Ranks the favorites in the given order, at once; back as it was and rejects if the server refuses. */
  reorderFavorites: (badgeIds: string[]) => Promise<void>;
}

type FavoritePositions = Map<string, number | null>;

const favoritePositionsOf = (overview: DistancesOverview | null): FavoritePositions =>
  new Map((overview?.badges ?? []).map((badge) => [badge.id, badge.favoritePosition]));

/** Ranks from 1, in the order of `ids`. */
const rankedFrom = (ids: string[]): FavoritePositions => new Map(ids.map((id, index) => [id, index + 1]));

/** Favorite badges of the user, in their order. */
export function favoriteBadges(badges: DistanceBadge[]): DistanceBadge[] {
  return badges
    .filter((badge) => badge.favoritePosition !== null)
    .sort((a, b) => (a.favoritePosition ?? 0) - (b.favoritePosition ?? 0));
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

  /** Shows the given ranks; badges left out are not favorites. */
  const showFavorites = useCallback((positions: FavoritePositions) => {
    setOverview((current) =>
      current
        ? {
            ...current,
            badges: current.badges.map((badge) => ({
              ...badge,
              favoritePosition: positions.get(badge.id) ?? null,
            })),
          }
        : current,
    );
  }, []);

  const setFavorite = useCallback(
    async (badge: DistanceBadge, favorite: boolean) => {
      const previous = favoritePositionsOf(overview);
      const ids = favoriteBadges(overview?.badges ?? [])
        .map(({ id }) => id)
        .filter((id) => id !== badge.id);
      showFavorites(rankedFrom(favorite ? [...ids, badge.id] : ids));
      try {
        await (favorite ? distancesService.addFavorite(badge.id) : distancesService.removeFavorite(badge.id));
      } catch (failure) {
        showFavorites(previous);
        throw failure;
      }
    },
    [overview, showFavorites],
  );

  const reorderFavorites = useCallback(
    async (badgeIds: string[]) => {
      const previous = favoritePositionsOf(overview);
      showFavorites(rankedFrom(badgeIds));
      try {
        await distancesService.reorderFavorites(badgeIds);
      } catch (failure) {
        showFavorites(previous);
        throw failure;
      }
    },
    [overview, showFavorites],
  );

  return { overview, error, refresh, setFavorite, reorderFavorites };
}

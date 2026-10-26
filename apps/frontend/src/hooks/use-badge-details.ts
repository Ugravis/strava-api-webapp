"use client";

import { useEffect, useState } from "react";
import type { DistanceBadgeDetails } from "@/lib/api/types";
import { distancesService } from "@/services/distances.service";

/** Completions and next estimate of one badge; nothing without a badge. */
export function useBadgeDetails(badgeId: string | null) {
  const [state, setState] = useState<{ id: string | null; details: DistanceBadgeDetails | null; error: boolean }>({
    id: null,
    details: null,
    error: false,
  });

  useEffect(() => {
    if (!badgeId) return;
    let cancelled = false;
    distancesService.getBadge(badgeId).then(
      (details) => {
        if (!cancelled) setState({ id: badgeId, details, error: false });
      },
      () => {
        if (!cancelled) setState({ id: badgeId, details: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [badgeId]);

  // A previous badge's answer is never shown for another one.
  return state.id === badgeId ? { details: state.details, error: state.error } : { details: null, error: false };
}

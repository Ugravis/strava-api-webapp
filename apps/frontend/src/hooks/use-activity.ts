"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import { activitiesService } from "@/services/activities.service";
import { tilesService } from "@/services/tiles.service";

const fetchDetails = sharedRequest(activitiesService.getDetails);
const fetchTiles = sharedRequest(tilesService.getActivityTiles);

/** Answer of a request for one activity, kept with the activity it answers. */
function useActivityRequest<T>(
  activityId: string | null,
  fetch: (key: string, id: string) => Promise<T>,
): { data: T | null; error: boolean } {
  const [state, setState] = useState<{ id: string | null; data: T | null; error: boolean }>({
    id: null,
    data: null,
    error: false,
  });

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    fetch(activityId, activityId).then(
      (data) => {
        if (!cancelled) setState({ id: activityId, data, error: false });
      },
      () => {
        if (!cancelled) setState({ id: activityId, data: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [activityId, fetch]);

  // A previous activity's answer is never shown for another one.
  return state.id === activityId ? state : { data: null, error: false };
}

/** Details of one activity of the user. */
export function useActivityDetails(activityId: string) {
  const { data, error } = useActivityRequest(activityId, fetchDetails);
  return { activity: data, error };
}

/** Tiles crossed by one activity; nothing without an activity. */
export function useActivityTiles(activityId: string | null) {
  const { data, error } = useActivityRequest(activityId, fetchTiles);
  return { tiles: data, error };
}

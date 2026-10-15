import { apiRequest } from "@/lib/api/client";
import type { ActivityTracksPage, MappableActivity } from "@/lib/api/types";

export const tracksService = {
  getMappableActivities: () => apiRequest<MappableActivity[]>("/activities/mappable"),

  /** Relayed from Strava: each call costs one request of the Strava quota. */
  getTracksPage: ({ after, page }: { after?: Date; page: number }) => {
    const query = new URLSearchParams({ page: String(page) });
    if (after) query.set("after", after.toISOString());
    return apiRequest<ActivityTracksPage>(`/connections/strava/tracks?${query}`);
  },
};

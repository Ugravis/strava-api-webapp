import { apiRequest } from "@/lib/api/client";
import type {
  ActivityTiles,
  HistoryMode,
  TileActivitiesPage,
  TileHistorySummary,
  TileStats,
  TileTimelineDay,
  TilesSummary,
  TileVisits,
} from "@/lib/api/types";

export const tilesService = {
  getSummary: () => apiRequest<TilesSummary>("/tiles/summary"),

  getStats: () => apiRequest<TileStats>("/tiles/stats"),

  getTimeline: () => apiRequest<TileTimelineDay[]>("/tiles/timeline"),

  getVisits: (zoom: number, x: number, y: number) => apiRequest<TileVisits>(`/tiles/${zoom}/${x}/${y}`),

  getActivityTiles: (activityId: string) => apiRequest<ActivityTiles>(`/tiles/activity/${activityId}`),

  getActivities: (zoom: number, x: number, y: number, limit: number, cursor: string | null) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<TileActivitiesPage>(`/tiles/${zoom}/${x}/${y}/activities?${query}`);
  },

  getHistory: (mode: HistoryMode, date: string) =>
    apiRequest<TileHistorySummary>(`/tiles/history?${new URLSearchParams({ mode, date })}`),
};

import { apiRequest } from "@/lib/api/client";
import type { TileStats, TilesSummary, TileVisits } from "@/lib/api/types";

export const tilesService = {
  getSummary: () => apiRequest<TilesSummary>("/tiles/summary"),

  getStats: () => apiRequest<TileStats>("/tiles/stats"),

  getVisits: (zoom: number, x: number, y: number) => apiRequest<TileVisits>(`/tiles/${zoom}/${x}/${y}`),
};

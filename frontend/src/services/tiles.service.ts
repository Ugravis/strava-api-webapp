import { apiRequest } from "@/lib/api/client";
import type { TileStats, TilesResponse, TileVisits } from "@/lib/api/types";

export const tilesService = {
  getTiles: () => apiRequest<TilesResponse>("/tiles"),

  getStats: () => apiRequest<TileStats>("/tiles/stats"),

  getVisits: (zoom: number, x: number, y: number) => apiRequest<TileVisits>(`/tiles/${zoom}/${x}/${y}`),
};

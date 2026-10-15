import { apiRequest } from "@/lib/api/client";
import type { TileStats, TilesResponse } from "@/lib/api/types";

export const tilesService = {
  getTiles: () => apiRequest<TilesResponse>("/tiles"),

  getStats: () => apiRequest<TileStats>("/tiles/stats"),
};

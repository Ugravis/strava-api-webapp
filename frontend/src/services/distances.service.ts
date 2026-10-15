import { apiRequest } from "@/lib/api/client";
import type { DistancesOverview } from "@/lib/api/types";

export const distancesService = {
  getOverview: () => apiRequest<DistancesOverview>("/distances"),
};

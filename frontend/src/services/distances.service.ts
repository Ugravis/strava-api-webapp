import { apiRequest } from "@/lib/api/client";
import type { DistanceBadgeDetails, DistancesOverview } from "@/lib/api/types";

const badgePath = (id: string) => `/distances/badges/${encodeURIComponent(id)}`;

export const distancesService = {
  getOverview: () => apiRequest<DistancesOverview>("/distances"),
  getBadge: (id: string) => apiRequest<DistanceBadgeDetails>(badgePath(id)),
  pin: (id: string) => apiRequest(`${badgePath(id)}/pin`, { method: "PUT" }),
  unpin: (id: string) => apiRequest(`${badgePath(id)}/pin`, { method: "DELETE" }),
};

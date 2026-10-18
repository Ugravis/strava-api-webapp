import { apiRequest } from "@/lib/api/client";
import type { DistanceBadgeDetails, DistancesOverview } from "@/lib/api/types";

const badgePath = (id: string) => `/distances/badges/${encodeURIComponent(id)}`;

export const distancesService = {
  getOverview: () => apiRequest<DistancesOverview>("/distances"),
  getBadge: (id: string) => apiRequest<DistanceBadgeDetails>(badgePath(id)),
  addFavorite: (id: string) => apiRequest(`${badgePath(id)}/favorite`, { method: "PUT" }),
  removeFavorite: (id: string) => apiRequest(`${badgePath(id)}/favorite`, { method: "DELETE" }),
  reorderFavorites: (badgeIds: string[]) =>
    apiRequest("/distances/favorites", { method: "PUT", body: { json: { badgeIds } } }),
};

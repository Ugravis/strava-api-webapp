import { apiRequest } from "@/lib/api/client";
import type { BadgeCompletion, DistanceBadgeDetails, DistancesOverview } from "@/lib/api/types";

const badgePath = (id: string) => `/distances/badges/${encodeURIComponent(id)}`;

export const distancesService = {
  getOverview: () => apiRequest<DistancesOverview>("/distances"),
  getBadge: (id: string) => apiRequest<DistanceBadgeDetails>(badgePath(id)),
  /** Completions of a badge after the `offset` latest ones. */
  getBadgeHistory: (id: string, offset: number) =>
    apiRequest<BadgeCompletion[]>(`${badgePath(id)}/history?offset=${offset}`),
  addFavorite: (id: string) => apiRequest(`${badgePath(id)}/favorite`, { method: "PUT" }),
  removeFavorite: (id: string) => apiRequest(`${badgePath(id)}/favorite`, { method: "DELETE" }),
  addToProfile: (id: string) => apiRequest(`${badgePath(id)}/profile`, { method: "PUT" }),
  removeFromProfile: (id: string) => apiRequest(`${badgePath(id)}/profile`, { method: "DELETE" }),
  reorderFavorites: (badgeIds: string[]) =>
    apiRequest("/distances/favorites", { method: "PUT", body: { json: { badgeIds } } }),
};

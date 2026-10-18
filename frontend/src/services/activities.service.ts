import { apiRequest } from "@/lib/api/client";
import type { ActivityDetails, ActivityStats } from "@/lib/api/types";

export const activitiesService = {
  getStats: () => apiRequest<ActivityStats>("/activities/stats"),

  getDetails: (id: string) => apiRequest<ActivityDetails>(`/activities/${id}`),
};

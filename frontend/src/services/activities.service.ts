import { apiRequest } from "@/lib/api/client";
import type { ActivityStats } from "@/lib/api/types";

export const activitiesService = {
  getStats: () => apiRequest<ActivityStats>("/activities/stats"),
};

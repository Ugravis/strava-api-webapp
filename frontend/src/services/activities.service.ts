import { apiRequest } from "@/lib/api/client";
import type {
  ActivitiesOverview,
  ActivityDay,
  ActivityDetails,
  ActivityStats,
  MonthDistance,
} from "@/lib/api/types";

export const activitiesService = {
  getStats: () => apiRequest<ActivityStats>("/activities/stats"),

  getOverview: () => apiRequest<ActivitiesOverview>("/activities/overview"),

  getYearDays: (year: number) => apiRequest<ActivityDay[]>(`/activities/days?year=${year}`),

  getMonthly: () => apiRequest<MonthDistance[]>("/activities/monthly"),

  getDetails: (id: string) => apiRequest<ActivityDetails>(`/activities/${id}`),
};

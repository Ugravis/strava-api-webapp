import { apiRequest } from "@/lib/api/client";
import type { StationDetails, VisitedStations } from "@/lib/api/types";

export const stationsService = {
  getVisited: () => apiRequest<VisitedStations>("/stations"),
  getDetails: (id: number) => apiRequest<StationDetails>(`/stations/${id}`),
};

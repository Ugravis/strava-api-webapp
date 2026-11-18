import type { ReportStationRequest } from "@kilotrace/shared";
import { apiRequest } from "@/lib/api/client";
import type { StationDetails, VisitedStations } from "@kilotrace/ui/lib/api/types";

export const stationsService = {
  getVisited: () => apiRequest<VisitedStations>("/stations"),
  getDetails: (id: number) => apiRequest<StationDetails>(`/stations/${id}`),
  /** A station missing or wrong, told to the team: about `stationId` from its panel, general from the band. */
  report: (body: ReportStationRequest) => apiRequest("/stations/reports", { method: "POST", body: { json: body } }),
};

import { apiRequest } from "@/lib/api/client";
import type { StravaConnectionStatus } from "@/lib/api/types";

/** Page the Strava authorization flow comes back to. */
export type StravaConnectOrigin = "dashboard" | "settings";

/** Browser navigation target starting the Strava OAuth flow. */
export function stravaAuthorizeUrl(from: StravaConnectOrigin): string {
  return `/api/connections/strava/authorize?from=${from}`;
}

export const stravaService = {
  getStatus: () => apiRequest<StravaConnectionStatus>("/connections/strava"),

  requestSync: () =>
    apiRequest<StravaConnectionStatus>("/connections/strava/sync", { method: "POST" }),

  disconnect: () => apiRequest("/connections/strava", { method: "DELETE" }),
};

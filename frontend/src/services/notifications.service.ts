import { apiRequest } from "@/lib/api/client";
import type { NotificationsOverview } from "@/lib/api/types";

/** Address of the server-sent events of the current user, through the same-origin proxy. */
export const NOTIFICATIONS_STREAM_URL = "/api/notifications/stream";

export const notificationsService = {
  getOverview: () => apiRequest<NotificationsOverview>("/notifications"),
  markAllRead: () => apiRequest("/notifications/read", { method: "POST" }),
};

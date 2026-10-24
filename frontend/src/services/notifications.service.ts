import { apiRequest } from "@/lib/api/client";
import type { NotificationCategory, NotificationsPage } from "@/lib/api/types";

/** Address of the server-sent events of the current user, through the same-origin proxy. */
export const NOTIFICATIONS_STREAM_URL = "/api/notifications/stream";

export const notificationsService = {
  getPage: (category: NotificationCategory, offset = 0) =>
    apiRequest<NotificationsPage>(`/notifications?${new URLSearchParams({ category, offset: String(offset) })}`),
  markRead: (ids: string[]) =>
    apiRequest("/notifications/read", { method: "POST", body: { json: { ids } } }),
};

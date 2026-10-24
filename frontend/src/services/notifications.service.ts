import { apiRequest } from "@/lib/api/client";
import type { NotificationCategory, NotificationsPage, NotificationType } from "@/lib/api/types";

/** Address of the server-sent events of the current user, through the same-origin proxy. */
export const NOTIFICATIONS_STREAM_URL = "/api/notifications/stream";

export const notificationsService = {
  getPage: (category: NotificationCategory, offset = 0) =>
    apiRequest<NotificationsPage>(`/notifications?${new URLSearchParams({ category, offset: String(offset) })}`),
  /** Marks the given notifications read, or all of them. */
  markRead: (ids?: string[]) =>
    apiRequest("/notifications/read", { method: "POST", body: { json: ids ? { ids } : {} } }),
  /** Marks read the notifications of a kind. */
  markReadOfType: (type: NotificationType) =>
    apiRequest("/notifications/read", { method: "POST", body: { json: { type } } }),
};

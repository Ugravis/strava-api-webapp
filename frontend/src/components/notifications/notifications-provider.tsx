"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { userProfileHref } from "@/config/routes";
import type { AppNotification, NotificationEvent, NotificationsOverview } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { NOTIFICATIONS_STREAM_URL, notificationsService } from "@/services/notifications.service";

interface NotificationsState {
  /** Null until the first response. */
  notifications: AppNotification[] | null;
  unreadCount: number;
  error: boolean;
  /** Marks every notification read, at once; the list keeps them shown as unread until it is refreshed. */
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

/**
 * Notifications of the current user, kept up to date in real time through
 * server-sent events; a new one is also announced by a toast. The browser
 * reconnects by itself after a drop: what was missed meanwhile is fetched again.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [overview, setOverview] = useState<NotificationsOverview | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(
    () =>
      notificationsService.getOverview().then(
        (next) => {
          setOverview(next);
          setError(false);
        },
        () => setError(true),
      ),
    [],
  );

  useEffect(() => {
    void refresh();
    const source = new EventSource(NOTIFICATIONS_STREAM_URL);
    let dropped = false;

    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as NotificationEvent;
      const added = event.notification;
      if (added) {
        setOverview((current) => ({
          // Replaces the previous notification of the same kind from the same actor, as the server does.
          notifications: [
            added,
            ...(current?.notifications ?? []).filter(
              ({ type, actor }) => type !== added.type || actor.id !== added.actor.id,
            ),
          ],
          unreadCount: event.unreadCount,
        }));
        toast(t(`toast.${added.type}`, { name: publicNameOf(added.actor) }), {
          action: { label: t("view"), onClick: () => router.push(userProfileHref(added.actor.username)) },
        });
      } else if (event.unreadCount === 0) {
        // Read from another tab.
        setOverview((current) => current && { ...current, unreadCount: 0 });
      } else {
        // A notification was withdrawn.
        void refresh();
      }
    };
    source.onerror = () => {
      dropped = true;
    };
    source.onopen = () => {
      if (dropped) void refresh();
      dropped = false;
    };
    return () => source.close();
  }, [refresh, router, t]);

  const markAllRead = useCallback(() => {
    setOverview((current) => current && { ...current, unreadCount: 0 });
    notificationsService.markAllRead().catch(() => void refresh());
  }, [refresh]);

  const state = useMemo<NotificationsState>(
    () => ({
      notifications: overview?.notifications ?? null,
      unreadCount: overview?.unreadCount ?? 0,
      error,
      markAllRead,
    }),
    [overview, error, markAllRead],
  );

  return <NotificationsContext value={state}>{children}</NotificationsContext>;
}

export function useNotifications(): NotificationsState {
  const state = use(NotificationsContext);
  if (!state) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return state;
}

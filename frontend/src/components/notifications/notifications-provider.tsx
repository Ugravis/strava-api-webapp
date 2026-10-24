"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { routes, userProfileHref } from "@/config/routes";
import type {
  AppNotification,
  NotificationCategory,
  NotificationEvent,
  NotificationType,
  NotificationsPage,
} from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { NOTIFICATIONS_STREAM_URL, notificationsService } from "@/services/notifications.service";

/** Kinds listed under each filter; `all` is not filtered. */
const CATEGORY_TYPES: Record<Exclude<NotificationCategory, "all">, readonly NotificationType[]> = {
  likes: ["profile_like"],
  follows: ["follow", "follow_request", "follow_accepted"],
};

function inCategory({ type }: AppNotification, category: NotificationCategory): boolean {
  return category === "all" || CATEGORY_TYPES[category].includes(type);
}

interface NotificationsState {
  category: NotificationCategory;
  setCategory: (category: NotificationCategory) => void;
  /** Loaded notifications of the category, the newest first; null until the first response. */
  notifications: AppNotification[] | null;
  /** Whether older notifications are left to load. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Loads the next page, if any. */
  loadMore: () => void;
  unreadCount: number;
  error: boolean;
  /** Marks the given notifications read. */
  markRead: (ids: readonly string[]) => void;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

/**
 * Notifications of the current user, a page at a time and filtered by
 * category, kept up to date in real time through server-sent events; a new one
 * is also announced by a toast. The browser reconnects by itself after a drop:
 * what was missed meanwhile is fetched again.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [category, setCategoryState] = useState<NotificationCategory>("all");
  const [page, setPage] = useState<Omit<NotificationsPage, "unreadCount"> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  // Read by the event handler and to drop the responses of a former category.
  const categoryRef = useRef(category);

  const refresh = useCallback(() => {
    const requested = categoryRef.current;
    return notificationsService.getPage(requested).then(
      ({ unreadCount: count, ...next }) => {
        setUnreadCount(count);
        if (requested !== categoryRef.current) return;
        setPage(next);
        setError(false);
      },
      () => setError(true),
    );
  }, []);

  const setCategory = useCallback(
    (next: NotificationCategory) => {
      if (next === categoryRef.current) return;
      categoryRef.current = next;
      setCategoryState(next);
      setPage(null);
      setLoadingMore(false);
      void refresh();
    },
    [refresh],
  );

  const loadMore = useCallback(() => {
    if (!page?.hasMore || loadingMore) return;
    const requested = categoryRef.current;
    setLoadingMore(true);
    notificationsService.getPage(requested, page.notifications.length).then(
      ({ unreadCount: count, notifications, hasMore }) => {
        setUnreadCount(count);
        if (requested !== categoryRef.current) return;
        setPage((current) => {
          if (!current) return current;
          // A notification received meanwhile shifts the pages: skip the repeated ones.
          const known = new Set(current.notifications.map(({ id }) => id));
          return {
            notifications: [...current.notifications, ...notifications.filter(({ id }) => !known.has(id))],
            hasMore,
          };
        });
        setLoadingMore(false);
      },
      () => {
        setError(true);
        setLoadingMore(false);
      },
    );
  }, [page, loadingMore]);

  useEffect(() => {
    void refresh();
    const source = new EventSource(NOTIFICATIONS_STREAM_URL);
    let dropped = false;

    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as NotificationEvent;
      const added = event.notification;
      setUnreadCount(event.unreadCount);
      if (added) {
        if (inCategory(added, categoryRef.current)) {
          setPage(
            (current) =>
              current && {
                ...current,
                // Replaces the previous notification of the same kind from the same actor, as the server does.
                notifications: [
                  added,
                  ...current.notifications.filter(
                    ({ type, actor }) => type !== added.type || !actor || actor.id !== added.actor?.id,
                  ),
                ],
              },
          );
        }
        const { actor } = added;
        toast(t(`toast.${added.type}`, { name: actor ? publicNameOf(actor) : "" }), {
          action: {
            label: t("view"),
            onClick: () => router.push(actor ? userProfileHref(actor.username) : routes.profile),
          },
        });
      } else if (event.read) {
        // Read here or from another tab; none listed means all of them.
        const read = new Set(event.read);
        setPage(
          (current) =>
            current && {
              ...current,
              notifications: current.notifications.map((notification) =>
                read.size === 0 || read.has(notification.id) ? { ...notification, read: true } : notification,
              ),
            },
        );
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

  const markRead = useCallback(
    (ids: readonly string[]) => {
      if (ids.length === 0) return;
      const marked = new Set(ids);
      setPage(
        (current) =>
          current && {
            ...current,
            notifications: current.notifications.map((notification) =>
              marked.has(notification.id) ? { ...notification, read: true } : notification,
            ),
          },
      );
      // The server sends the exact count back.
      setUnreadCount((count) => Math.max(0, count - marked.size));
      notificationsService.markRead([...marked]).catch(() => void refresh());
    },
    [refresh],
  );

  const state = useMemo<NotificationsState>(
    () => ({
      category,
      setCategory,
      notifications: page?.notifications ?? null,
      hasMore: page?.hasMore ?? false,
      loadingMore,
      loadMore,
      unreadCount,
      error,
      markRead,
    }),
    [category, setCategory, page, loadingMore, loadMore, unreadCount, error, markRead],
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

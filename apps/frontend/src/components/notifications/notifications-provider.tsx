"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

/**
 * Where a notification leads: the profile of its actor, the own one for an
 * anonymous like, the settings for a notice of the team.
 */
export function notificationHref({ type, actor }: AppNotification): string {
  if (type === "moderation") return routes.settingsProfile;
  if (type === "strava_unlinked") return routes.settings;
  if (type === "role_changed") return routes.dashboard;
  return actor ? userProfileHref(actor.username) : routes.profiles;
}

/** Filters of the list, all loaded up front so that switching is instant. */
export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = ["all", "likes", "follows"];

/** Kinds listed under each filter; `all` is not filtered. */
const CATEGORY_TYPES: Record<Exclude<NotificationCategory, "all">, readonly NotificationType[]> = {
  likes: ["profile_like"],
  follows: ["follow", "follow_request", "follow_accepted"],
};

function inCategory({ type }: AppNotification, category: NotificationCategory): boolean {
  return category === "all" || CATEGORY_TYPES[category].includes(type);
}

type Page = Omit<NotificationsPage, "unreadCount">;
type Pages = Record<NotificationCategory, Page | null>;

const NO_PAGES: Pages = { all: null, likes: null, follows: null };

/** Applies a change to the notifications of every category. */
function mapPages(pages: Pages, change: (notifications: AppNotification[], category: NotificationCategory) => AppNotification[]): Pages {
  return Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => {
      const page = pages[category];
      return [category, page && { ...page, notifications: change(page.notifications, category) }];
    }),
  ) as Pages;
}

function markedRead(notifications: AppNotification[], ids?: ReadonlySet<string>): AppNotification[] {
  return notifications.map((notification) =>
    notification.read || (ids && !ids.has(notification.id)) ? notification : { ...notification, read: true },
  );
}

interface NotificationsState {
  category: NotificationCategory;
  setCategory: (category: NotificationCategory) => void;
  /** Loaded notifications of the category, the newest first; null until the first response. */
  notifications: AppNotification[] | null;
  /** Whether older notifications are left to load. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Loads the next page of the category, if any. */
  loadMore: () => void;
  unreadCount: number;
  /** Bumped on every event of the stream, for what depends on the notifications to fetch itself again. */
  revision: number;
  error: boolean;
  /** Unread when the panel opened, still shown as such while it is open. */
  highlighted: ReadonlySet<string>;
  /** Clears the unread count at once, keeping the unread notifications highlighted. */
  openPanel: () => void;
  /** Marks read what came in while the panel was open, and drops the highlight. */
  closePanel: () => void;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

/**
 * Notifications of the current user, a page at a time for each category,
 * kept up to date in real time through server-sent events; a new one is also
 * announced by a toast. The browser reconnects by itself after a drop: what
 * was missed meanwhile is fetched again.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [pages, setPages] = useState<Pages>(NO_PAGES);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState<NotificationCategory | null>(null);
  const [error, setError] = useState(false);
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(new Set());
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(
    () =>
      Promise.all(NOTIFICATION_CATEGORIES.map((each) => notificationsService.getPage(each))).then(
        (responses) => {
          setPages(
            Object.fromEntries(
              responses.map(({ notifications, hasMore }, index) => [NOTIFICATION_CATEGORIES[index], { notifications, hasMore }]),
            ) as Pages,
          );
          setUnreadCount(responses[0]?.unreadCount ?? 0);
          setError(false);
        },
        () => setError(true),
      ),
    [],
  );

  const loadMore = useCallback(() => {
    const page = pages[category];
    if (!page?.hasMore || loadingMore) return;
    setLoadingMore(category);
    notificationsService.getPage(category, page.notifications.length).then(
      ({ notifications, hasMore }) => {
        setPages((current) => {
          const loaded = current[category];
          if (!loaded) return current;
          // A notification received meanwhile shifts the pages: skip the repeated ones.
          const known = new Set(loaded.notifications.map(({ id }) => id));
          return {
            ...current,
            [category]: {
              notifications: [...loaded.notifications, ...notifications.filter(({ id }) => !known.has(id))],
              hasMore,
            },
          };
        });
        setLoadingMore(null);
      },
      () => {
        setError(true);
        setLoadingMore(null);
      },
    );
  }, [pages, category, loadingMore]);

  useEffect(() => {
    void refresh();
    const source = new EventSource(NOTIFICATIONS_STREAM_URL);
    let dropped = false;

    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as NotificationEvent;
      const added = event.notification;
      setUnreadCount(event.unreadCount);
      setRevision((current) => current + 1);
      if (added) {
        setPages((current) =>
          mapPages(current, (notifications, each) =>
            inCategory(added, each)
              ? [
                  added,
                  // Replaces the previous notification of the same kind from the same actor, as the server does.
                  ...notifications.filter(
                    ({ type, actor }) => type !== added.type || !actor || actor.id !== added.actor?.id,
                  ),
                ]
              : notifications,
          ),
        );
        const { actor } = added;
        toast(t(`toast.${added.type}`, { name: actor ? publicNameOf(actor) : "" }), {
          action: {
            label: t("view"),
            onClick: () => router.push(notificationHref(added)),
          },
        });
      } else if (event.read) {
        // Read here or from another tab; none listed means all of them.
        const read = event.read.length > 0 ? new Set(event.read) : undefined;
        setPages((current) => mapPages(current, (notifications) => markedRead(notifications, read)));
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

  const unreadIds = useCallback(
    () =>
      new Set(
        NOTIFICATION_CATEGORIES.flatMap((each) =>
          (pages[each]?.notifications ?? []).filter(({ read }) => !read).map(({ id }) => id),
        ),
      ),
    [pages],
  );

  const openPanel = useCallback(() => {
    setHighlighted(unreadIds());
    if (unreadCount === 0) return;
    setUnreadCount(0);
    setPages((current) => mapPages(current, (notifications) => markedRead(notifications)));
    notificationsService.markRead().catch(() => void refresh());
  }, [unreadIds, unreadCount, refresh]);

  const closePanel = useCallback(() => {
    const arrived = unreadIds();
    setHighlighted(new Set());
    if (arrived.size === 0) return;
    setPages((current) => mapPages(current, (notifications) => markedRead(notifications, arrived)));
    notificationsService.markRead([...arrived]).catch(() => void refresh());
  }, [unreadIds, refresh]);

  const state = useMemo<NotificationsState>(
    () => ({
      category,
      setCategory,
      notifications: pages[category]?.notifications ?? null,
      hasMore: pages[category]?.hasMore ?? false,
      loadingMore: loadingMore === category,
      loadMore,
      unreadCount,
      revision,
      error,
      highlighted,
      openPanel,
      closePanel,
    }),
    [category, pages, loadingMore, loadMore, unreadCount, revision, error, highlighted, openPanel, closePanel],
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

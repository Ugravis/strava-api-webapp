"use client";

import { BellIcon, HeartIcon, ShieldIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { FollowButton, type FollowState } from "@/components/community/follow-button";
import { RequestAnswerButtons } from "@/components/community/request-answer-buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import type { AppNotification, NotificationCategory } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { NOTIFICATION_CATEGORIES, notificationHref, useNotifications } from "./notifications-provider";

/** A wavy line, drawn with the background color of the element. */
const WAVE_STYLE: CSSProperties = {
  maskImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='6'%3E%3Cpath d='M0 3q3-3 6 0t6 0' fill='none' stroke='black'/%3E%3C/svg%3E\")",
  maskRepeat: "repeat-x",
  maskSize: "12px 6px",
};

/**
 * Item content, down to the icon paths, is recolored on focus: the heart is
 * painted with the color itself, as `currentColor` would follow, on an opaque
 * disc that the tinted background does not show through.
 */
const HEART_STYLE: CSSProperties = { fill: "var(--color-rose-500)", stroke: "var(--color-rose-500)" };
const HEART_DISC_STYLE: CSSProperties = {
  backgroundColor: "color-mix(in oklab, var(--color-rose-500) 10%, var(--popover))",
};

/** Count shown on the bell, capped. */
function unreadLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

type Period = "today" | "yesterday" | "week" | "month" | "older";

const DAY_MS = 86_400_000;

/** Period of a date, counted in calendar days before now. */
function periodOf(date: Date, now: Date): Period {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.ceil((startOfToday - date.getTime()) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return "week";
  if (days < 30) return "month";
  return "older";
}

/** Consecutive notifications of a same period, the list being sorted. */
function groupByPeriod(notifications: AppNotification[], now: Date): { period: Period; items: AppNotification[] }[] {
  const groups: { period: Period; items: AppNotification[] }[] = [];
  for (const notification of notifications) {
    const period = periodOf(new Date(notification.createdAt), now);
    const last = groups.at(-1);
    if (last?.period === period) last.items.push(notification);
    else groups.push({ period, items: [notification] });
  }
  return groups;
}

interface NotificationsMenuProps {
  /** The bell, rendered by the caller to fit where it sits. */
  trigger: ReactElement;
  side?: "bottom" | "right" | "top";
  align?: "start" | "center" | "end";
}

/**
 * The notifications in a menu, opened from the given trigger, a page at a
 * time as the list is scrolled. Opening it clears the unread count; those
 * unread stay highlighted until it closes.
 */
export function NotificationsMenu({ trigger, side = "bottom", align = "end" }: NotificationsMenuProps) {
  const t = useTranslations("notifications");
  const now = useNow({ updateInterval: 60_000 });
  const { category, setCategory, notifications, hasMore, loadingMore, loadMore, error, highlighted, openPanel, closePanel } =
    useNotifications();
  const [filterOpen, setFilterOpen] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  // Loads the next page once the end of the list scrolls into view.
  useEffect(() => {
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => entry?.isIntersecting && loadMore(), {
      root: sentinel.parentElement,
      rootMargin: "64px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, loadMore]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          // Always opens on every notification.
          setCategory("all");
          openPanel();
        } else {
          closePanel();
        }
      }}
    >
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent side={side} align={align} sideOffset={6} className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between gap-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-sm font-semibold text-foreground">{t("label")}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSub open={filterOpen} onOpenChange={setFilterOpen}>
            <DropdownMenuSubTrigger
              openOnHover={false}
              className="gap-1 px-2 text-xs text-muted-foreground [&>svg:last-child]:ml-0 [&>svg:last-child]:size-3.5 [&>svg:last-child]:rotate-90"
            >
              {t(`category.${category}`)}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent side="bottom" align="center" alignOffset={0} sideOffset={4}>
              <DropdownMenuRadioGroup
                value={category}
                onValueChange={(value: NotificationCategory) => {
                  setCategory(value);
                  // Closes the filter list alone, not the menu.
                  setFilterOpen(false);
                }}
              >
                {NOTIFICATION_CATEGORIES.map((value) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {t(`category.${value}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {error && !notifications ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("error")}</p>
          ) : !notifications ? (
            <div aria-busy className="flex flex-col gap-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <>
              {groupByPeriod(notifications, now).map(({ period, items }) => (
                <DropdownMenuGroup key={period} className="flex flex-col gap-1.5 p-1">
                  <DropdownMenuLabel className="flex items-center gap-2 px-1.5 py-0 text-[10px] font-normal text-muted-foreground/70">
                    <span aria-hidden className="h-1.5 flex-1 bg-border/70" style={WAVE_STYLE} />
                    {t(`period.${period}`)}
                    <span aria-hidden className="h-1.5 flex-1 bg-border/70" style={WAVE_STYLE} />
                  </DropdownMenuLabel>
                  {items.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      unread={!notification.read || highlighted.has(notification.id)}
                    />
                  ))}
                </DropdownMenuGroup>
              ))}
              {loadingMore && (
                <div aria-busy className="p-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              <div ref={setSentinel} aria-hidden className="h-px" />
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationItem({ notification, unread }: { notification: AppNotification; unread: boolean }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const { actor, details } = notification;
  const href = notificationHref(notification);
  const fromTeam = notification.type === "moderation" || notification.type === "strava_unlinked";
  // A request is answered, or a follower followed back, from the notification itself.
  const request = actor && notification.type === "follow_request";
  const followBack = actor && notification.followBack;
  /** Following back from here, kept shown once done. */
  const [followState, setFollowState] = useState<FollowState>("none");

  return (
    <DropdownMenuItem
      // No buttons within a link.
      {...(request || followBack ? { onClick: () => router.push(href) } : { render: <Link href={href} /> })}
      className={cn(
        "items-start gap-3 py-2 pr-3",
        unread && "bg-rose-500/5 focus:bg-rose-500/10 dark:bg-rose-500/10 dark:focus:bg-rose-500/15",
      )}
    >
      {actor ? (
        <UserAvatar user={actor} className="size-8" />
      ) : fromTeam ? (
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <ShieldIcon className="size-4" aria-label={t("team")} />
        </span>
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-full" style={HEART_DISC_STYLE}>
          <HeartIcon className="size-4" style={HEART_STYLE} aria-hidden />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-snug whitespace-normal">
          {t.rich(notification.type, {
            name: actor ? publicNameOf(actor) : "",
            fields: format.list((details?.fields ?? []).map((field) => t(`fields.${field}`))),
            b: (chunks) => (
              <span className="font-semibold underline-offset-2 hover:underline">
                {chunks}
              </span>
            ),
          })}
        </span>
        {details?.reason && (
          <span className="text-xs whitespace-normal text-muted-foreground">{t("reason", { reason: details.reason })}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {format.relativeTime(new Date(notification.createdAt), now)}
        </span>
        {request && <RequestAnswerButtons username={actor.username} className="mt-1" />}
        {followBack && (
          // Kept from the item, which would open the profile.
          <span className="mt-1" onClick={(event) => event.stopPropagation()}>
            <FollowButton username={actor.username} state={followState} followsViewer onChange={setFollowState} />
          </span>
        )}
      </span>
      {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rose-500" aria-hidden />}
    </DropdownMenuItem>
  );
}

/** Dot with the count of unread notifications, over the bell. */
function UnreadDot({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
        className,
      )}
    >
      {unreadLabel(count)}
    </span>
  );
}

/** The bell in the top bar, on mobile. */
export function HeaderNotificationsButton() {
  const t = useTranslations("notifications");
  const { unreadCount } = useNotifications();
  const label = unreadCount > 0 ? t("unread", { count: unreadCount }) : t("label");

  return (
    <NotificationsMenu
      trigger={
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <BellIcon />
          <UnreadDot count={unreadCount} className="absolute -top-0.5 -right-0.5" />
        </Button>
      }
    />
  );
}

/** Notifications entry of the sidebar, with the unread count; on the bell once the sidebar is collapsed. */
export function SidebarNotificationsItem() {
  const t = useTranslations("notifications");
  const { isMobile } = useSidebar();
  const { unreadCount } = useNotifications();
  const label = unreadCount > 0 ? t("unread", { count: unreadCount }) : t("label");

  return (
    <SidebarMenuItem>
      <NotificationsMenu
        side={isMobile ? "bottom" : "right"}
        align={isMobile ? "start" : "center"}
        trigger={
          <SidebarMenuButton
            tooltip={label}
            aria-label={label}
            className="relative data-popup-open:bg-sidebar-group"
          >
            <BellIcon />
            <span>{t("label")}</span>
            <UnreadDot
              count={unreadCount}
              className="ml-auto group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:right-0"
            />
          </SidebarMenuButton>
        }
      />
    </SidebarMenuItem>
  );
}

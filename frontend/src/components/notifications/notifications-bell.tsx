"use client";

import { BellIcon, HeartIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactElement } from "react";
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
import { routes, userProfileHref } from "@/config/routes";
import type { AppNotification, NotificationCategory } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notifications-provider";

const CATEGORIES: readonly NotificationCategory[] = ["all", "likes", "follows"];

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
 * time as the list is scrolled. Those shown while it is open are marked read
 * once it closes.
 */
export function NotificationsMenu({ trigger, side = "bottom", align = "end" }: NotificationsMenuProps) {
  const t = useTranslations("notifications");
  const now = useNow({ updateInterval: 60_000 });
  const { category, setCategory, notifications, hasMore, loadingMore, loadMore, error, markRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  // Unread notifications shown since the menu opened, whatever the filter.
  const seen = useRef(new Set<string>());
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    for (const { id, read } of notifications ?? []) {
      if (!read) seen.current.add(id);
    }
  }, [open, notifications]);

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
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) return;
        markRead([...seen.current]);
        seen.current = new Set();
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
            <DropdownMenuSubContent side="bottom" align="end" alignOffset={0} sideOffset={4}>
              <DropdownMenuRadioGroup
                value={category}
                onValueChange={(value: NotificationCategory) => {
                  setCategory(value);
                  // Closes the filter list alone, not the menu.
                  setFilterOpen(false);
                }}
              >
                {CATEGORIES.map((value) => (
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
                  <DropdownMenuLabel className="flex items-center gap-2 px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground after:h-px after:flex-1 after:bg-border">
                    {t(`period.${period}`)}
                  </DropdownMenuLabel>
                  {items.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
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

function NotificationItem({ notification }: { notification: AppNotification }) {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { actor, read } = notification;

  return (
    <DropdownMenuItem
      // A request is answered from the own profile, where an anonymous like is counted.
      render={
        <Link href={actor && notification.type !== "follow_request" ? userProfileHref(actor.username) : routes.profile} />
      }
      className={cn(
        "items-start gap-3 py-2 pr-3",
        !read && "bg-rose-500/5 focus:bg-rose-500/10 dark:bg-rose-500/10 dark:focus:bg-rose-500/15",
      )}
    >
      {actor ? (
        <UserAvatar user={actor} className="size-8" />
      ) : (
        // Kept rose on focus, which recolors the item content.
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-rose-500/10 text-rose-500!">
          <HeartIcon className="size-4 fill-current text-rose-500!" aria-hidden />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-snug whitespace-normal">
          {t.rich(notification.type, {
            name: actor ? publicNameOf(actor) : "",
            b: (chunks) => <span className="font-semibold">{chunks}</span>,
          })}
        </span>
        <span className="text-xs text-muted-foreground">
          {format.relativeTime(new Date(notification.createdAt), now)}
        </span>
      </span>
      {!read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-rose-500" aria-hidden />}
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

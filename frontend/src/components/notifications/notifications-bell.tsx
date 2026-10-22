"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState, type ReactElement } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { routes, userProfileHref } from "@/config/routes";
import type { AppNotification } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { useNotifications } from "./notifications-provider";

/** Count shown on the bell, capped. */
function unreadLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

interface NotificationsMenuProps {
  /** The bell, rendered by the caller to fit where it sits. */
  trigger: ReactElement;
  side?: "bottom" | "right" | "top";
  align?: "start" | "center" | "end";
}

/**
 * The notifications in a menu, opened from the given trigger. Opening it marks
 * them read; those unread are still highlighted until it closes.
 */
export function NotificationsMenu({ trigger, side = "bottom", align = "end" }: NotificationsMenuProps) {
  const t = useTranslations("notifications");
  const { notifications, unreadCount, error, markAllRead } = useNotifications();
  // Unread when the menu was opened, kept highlighted while it is open.
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        setHighlighted(new Set(notifications?.filter(({ read }) => !read).map(({ id }) => id)));
        if (unreadCount > 0) markAllRead();
      }}
    >
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent side={side} align={align} sideOffset={6} className="w-80 max-w-[calc(100vw-2rem)]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-sm font-semibold text-foreground">{t("label")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="max-h-96 overflow-y-auto">
          {error ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("error")}</p>
          ) : !notifications ? (
            <div aria-busy className="flex flex-col gap-2 p-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  unread={highlighted.has(notification.id)}
                />
              ))}
            </DropdownMenuGroup>
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
  const { actor } = notification;

  return (
    <DropdownMenuItem
      // A request is answered from the own profile.
      render={<Link href={notification.type === "follow_request" ? routes.profile : userProfileHref(actor.username)} />}
      className={cn("items-start gap-3 py-2", unread && "bg-primary/5")}
    >
      <UserAvatar user={actor} className="size-8" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-snug whitespace-normal">
          {t.rich(notification.type, {
            name: publicNameOf(actor),
            b: (chunks) => <span className="font-semibold">{chunks}</span>,
          })}
        </span>
        <span className="text-xs text-muted-foreground">
          {format.relativeTime(new Date(notification.createdAt), now)}
        </span>
      </span>
      {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />}
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
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground tabular-nums",
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

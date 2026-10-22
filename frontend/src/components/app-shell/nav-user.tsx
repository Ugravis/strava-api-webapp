"use client";

import { EllipsisIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { routes } from "@/config/routes";
import type { User } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { SoundSubmenu } from "./sound-submenu";
import { ThemeMenuItem } from "./theme-menu-item";
import { useLogout } from "./use-logout";

function UserSummary({ user }: { user: User }) {
  return (
    <>
      <UserAvatar user={user} className="size-8 rounded-lg after:rounded-lg" fallbackClassName="rounded-lg" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{publicNameOf(user)}</span>
        <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
      </div>
    </>
  );
}

export function NavUser({ user }: { user: User }) {
  const t = useTranslations("nav");
  const { isMobile, setOpenMobile } = useSidebar();
  const logout = useLogout();

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              size="lg"
              aria-label={t("userMenu")}
              className="data-popup-open:bg-sidebar-group"
            />
          }
        >
          <UserSummary user={user} />
          <EllipsisIcon className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56"
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 font-normal text-foreground">
              <UserSummary user={user} />
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              render={<Link href={routes.settings} onClick={() => setOpenMobile(false)} />}
            >
              <SettingsIcon />
              {t("settings")}
            </DropdownMenuItem>
            <ThemeMenuItem />
            <SoundSubmenu />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
              <LogOutIcon />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

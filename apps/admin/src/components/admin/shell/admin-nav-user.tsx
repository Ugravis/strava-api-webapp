"use client";

import { ThemeMenuItem } from "@kilotrace/ui/components/app-shell/theme-menu-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@kilotrace/ui/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@kilotrace/ui/components/ui/sidebar";
import { UserAvatar } from "@kilotrace/ui/components/user/user-avatar";
import { publicNameOf } from "@kilotrace/ui/lib/user";
import { EllipsisIcon, LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { signOut } from "@/lib/admin/session-actions";

export interface AdminUserSummary {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

function UserSummary({ user }: { user: AdminUserSummary }) {
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

/** Account menu of the back office: the theme, and the sign-out of the back office only. */
export function AdminNavUser({ user }: { user: AdminUserSummary }) {
  const t = useTranslations("nav");
  const { isMobile } = useSidebar();
  const [pending, startTransition] = useTransition();

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuButton size="lg" aria-label={t("userMenu")} className="data-popup-open:bg-sidebar-group" />}
        >
          <UserSummary user={user} />
          <EllipsisIcon className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" side={isMobile ? "top" : "right"} align="end" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 font-normal text-foreground">
              <UserSummary user={user} />
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <ThemeMenuItem />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => startTransition(() => signOut())}>
              <LogOutIcon />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

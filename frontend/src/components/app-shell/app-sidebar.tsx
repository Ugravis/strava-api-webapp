"use client";

import Link from "next/link";
import { AppLogoMark } from "@/components/brand/app-logo";
import { SidebarNotificationsItem } from "@/components/notifications/notifications-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { mainNavigation } from "@/config/navigation";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { siteConfig } from "@/config/site";
import type { User } from "@/lib/api/types";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarToggleMenuItem } from "./sidebar-toggle-menu-item";
import { SoundMenuItem } from "./sound-menu-item";
import { ThemeMenuItem } from "./theme-menu-item";

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={siteConfig.name}
              render={<Link href={DEFAULT_AUTHENTICATED_ROUTE} />}
            >
              <AppLogoMark />
              <span className="truncate font-semibold">{siteConfig.name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarNotificationsItem />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarToggleMenuItem />
          <ThemeMenuItem />
          <SoundMenuItem />
          <NavUser user={user} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

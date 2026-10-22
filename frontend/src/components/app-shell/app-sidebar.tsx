"use client";

import { SidebarNotificationsItem } from "@/components/notifications/notifications-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar";
import { mainNavigation } from "@/config/navigation";
import type { User } from "@/lib/api/types";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { SidebarBrand } from "./sidebar-brand";

export function AppSidebar({ user }: { user: User }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarBrand />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={mainNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarNotificationsItem />
          <NavUser user={user} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

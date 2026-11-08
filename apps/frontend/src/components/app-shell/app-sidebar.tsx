"use client";

import type { ReactNode } from "react";
import { SidebarNotificationsItem } from "@/components/notifications/notifications-bell";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarSeparator,
} from "@kilotrace/ui/components/ui/sidebar";
import { mainNavigation } from "@/config/navigation";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import type { User } from "@kilotrace/ui/lib/api/types";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { ToAdminLink } from "./to-admin-link";
import { SidebarBrand } from "@kilotrace/ui/components/app-shell/sidebar-brand";

export interface AppSidebarSlots {
  /** Entries of the sidebar; the main navigation of the site by default. */
  navigation?: ReactNode;
  /** Link set apart above the user menu, to another part of the site; the back office for its team by default. */
  switchLink?: ReactNode;
  /** Target of the logo. */
  homeHref?: string;
}

export function AppSidebar({
  user,
  navigation = <NavMain items={mainNavigation} />,
  switchLink = <ToAdminLink role={user.adminRole} />,
  homeHref = DEFAULT_AUTHENTICATED_ROUTE,
}: AppSidebarSlots & { user: User }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarBrand href={homeHref} />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator className="mt-1" />
      <SidebarGroup>
        <SidebarMenu>
          <SidebarNotificationsItem />
        </SidebarMenu>
      </SidebarGroup>
      <SidebarSeparator />
      <SidebarContent>
        {navigation}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {switchLink}
          <NavUser user={user} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

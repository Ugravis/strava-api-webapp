"use client";

import { SidebarBrand } from "@kilotrace/ui/components/app-shell/sidebar-brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  SidebarSeparator,
} from "@kilotrace/ui/components/ui/sidebar";
import type { ReactNode } from "react";
import { type AdminUserSummary, AdminNavUser } from "./admin-nav-user";

/** Sidebar of the back office: the logo, its navigation, the way back to the site and the account menu. */
export function AdminSidebar({
  user,
  navigation,
  switchLink,
}: {
  user: AdminUserSummary;
  navigation: ReactNode;
  switchLink: ReactNode;
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarBrand href="/dashboard" variant="admin" />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator className="mt-1" />
      <SidebarContent>{navigation}</SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {switchLink}
          <AdminNavUser user={user} />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

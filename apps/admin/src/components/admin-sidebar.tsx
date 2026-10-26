"use client";

import type { AdminMe } from "@kilotrace/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@kilotrace/ui/components/sidebar";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemsFor } from "@/config/navigation";
import { ROLE_LABELS } from "@/config/roles";
import { routes } from "@/config/routes";

/** Only the sections the role may open; the API refuses the others anyway. */
export function AdminSidebar({ me }: { me: AdminMe }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={routes.home} />}>
              <ShieldCheck />
              <span className="truncate font-semibold">Kilotrace admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItemsFor(me.role).map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={href === routes.home ? pathname === href : pathname.startsWith(href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="grid min-w-0 px-2 py-1 text-sm leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate font-medium">{me.email}</span>
          <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[me.role]}</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

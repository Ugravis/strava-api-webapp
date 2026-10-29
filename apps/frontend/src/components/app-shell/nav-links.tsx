"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavLink {
  href: string;
  label: string;
  icon: ReactNode;
  /** Active on its own path only, not on the pages below it. */
  exact?: boolean;
  /** Figure shown in a pill at the end of the entry. */
  badge?: number;
}

/** Plain sidebar entries, labelled by the caller (a server component, for sections kept off the client messages). */
export function NavLinks({ title, items }: { title?: string; items: readonly NavLink[] }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      {title ? <SidebarGroupLabel className="tracking-wider uppercase">{title}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  render={
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpenMobile(false)}
                    />
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {item.badge === undefined ? null : (
                  <SidebarMenuBadge className="rounded-full bg-sidebar-accent px-1.5">{item.badge.toLocaleString("fr-FR")}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

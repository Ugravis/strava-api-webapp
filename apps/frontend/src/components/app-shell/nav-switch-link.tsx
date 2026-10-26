"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

/**
 * Link to another part of the site, set apart at the bottom of the sidebar,
 * with a small caption under its label. Only its icon shows once collapsed.
 */
export function NavSwitchLink({
  href,
  label,
  caption,
  icon,
}: {
  href: string;
  label: string;
  caption: string;
  icon: ReactNode;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        tooltip={label}
        className="border border-sidebar-border bg-sidebar-group hover:bg-sidebar-accent group-data-[collapsible=icon]:border-transparent"
        render={<Link href={href} onClick={() => setOpenMobile(false)} />}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground [&>svg]:size-4">
          {icon}
        </span>
        <span className="grid flex-1 text-left leading-tight">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="truncate text-xs text-muted-foreground">{caption}</span>
        </span>
        <ChevronRightIcon className="ml-auto text-sidebar-foreground/55" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

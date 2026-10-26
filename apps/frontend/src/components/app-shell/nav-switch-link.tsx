"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

/**
 * Link to another part of the site, set apart at the bottom of the sidebar,
 * in blue tones with a small caption under its label, and parted from what
 * follows by a separator. Only its icon shows once collapsed.
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
        className="border border-blue-500/30 bg-blue-500/10 text-blue-950 hover:bg-blue-500/15 hover:text-blue-950 dark:text-blue-50 dark:hover:text-blue-50 group-data-[collapsible=icon]:border-transparent"
        render={<Link href={href} onClick={() => setOpenMobile(false)} />}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white [&>svg]:size-4">
          {icon}
        </span>
        <span className="grid flex-1 text-left leading-tight">
          <span className="truncate text-sm font-medium">{label}</span>
          <span className="truncate text-xs text-blue-800/70 dark:text-blue-200/70">{caption}</span>
        </span>
        <ChevronRightIcon className="ml-auto text-blue-700/60 dark:text-blue-300/60" />
      </SidebarMenuButton>
      <SidebarSeparator className="mx-0 mt-2 mb-1" />
    </SidebarMenuItem>
  );
}

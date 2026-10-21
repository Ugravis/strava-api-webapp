"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavigationItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const noQuickAccessActive = () => false;

export function NavMain({ items }: { items: NavigationItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavEntry key={item.href} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * An entry of the navigation, with its quick access unfolded under it, both
 * on the background of a group. Only one entry is marked active: a link of
 * the quick access rather than the entry.
 */
function NavEntry({ item }: { item: NavigationItem }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const useQuickAccessActive = item.useQuickAccessActive ?? noQuickAccessActive;
  const quickAccessActive = useQuickAccessActive();
  const label = t(item.labelKey);
  const inSection = isActive(pathname, item.href);
  const active = inSection && !quickAccessActive;
  const QuickAccess = item.quickAccess;
  // Kept unfolded in the section, and on mobile, where nothing hovers.
  const unfolded = inSection || isMobile;

  return (
    <SidebarMenuItem
      className={cn(
        QuickAccess && "rounded-md transition-colors",
        QuickAccess && (unfolded ? "bg-sidebar-group" : "hover:bg-sidebar-group hover:delay-500 focus-within:bg-sidebar-group"),
      )}
    >
      <SidebarMenuButton
        isActive={active}
        tooltip={label}
        render={
          <Link
            href={item.href}
            aria-current={inSection ? "page" : undefined}
            onClick={() => setOpenMobile(false)}
          />
        }
      >
        <item.icon />
        <span>{label}</span>
      </SidebarMenuButton>
      {QuickAccess && (
        // Unfolded on hover after a short delay, so that the pointer passing by does not move the entries below.
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            unfolded
              ? "grid-rows-[1fr]"
              : "grid-rows-[0fr] group-focus-within/menu-item:grid-rows-[1fr] group-hover/menu-item:grid-rows-[1fr] group-hover/menu-item:delay-500",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <QuickAccess onNavigate={() => setOpenMobile(false)} />
          </div>
        </div>
      )}
    </SidebarMenuItem>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
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
const noCount = () => null;

export function NavMain({ items }: { items: NavigationItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        {/* Spaced, so that two lit entries never touch. */}
        <SidebarMenu className="gap-1">
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
  const useCount = item.useCount ?? noCount;
  const count = useCount();
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
        // The group is lit as a whole, at once on hover: its links mark themselves by their text only.
        QuickAccess &&
          (unfolded ? "bg-sidebar-group" : "hover:bg-sidebar-group focus-within:bg-sidebar-group"),
        QuickAccess && "[&_[data-sidebar=menu-button]]:bg-transparent! [&>[data-sidebar=menu-button][data-active]]:font-medium",
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
        <item.icon className={cn(inSection && item.activeIconClass)} />
        <span>{label}</span>
        {count !== null && <span className="sr-only">{t("cards", { count })}</span>}
      </SidebarMenuButton>
      {count !== null && (
        <SidebarMenuBadge className="text-sidebar-foreground/55" aria-hidden>
          {count}
        </SidebarMenuBadge>
      )}
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
          {/* Links kept lighter, underlined on hover and when active. */}
          <div className="min-h-0 overflow-hidden [&_[data-sidebar=menu-button]]:text-sidebar-foreground/55! [&_[data-sidebar=menu-button]>span]:underline-offset-4 [&_[data-sidebar=menu-button]:hover>span]:underline [&_[data-sidebar=menu-button][data-active]>span]:underline">
            <QuickAccess onNavigate={() => setOpenMobile(false)} />
          </div>
        </div>
      )}
    </SidebarMenuItem>
  );
}

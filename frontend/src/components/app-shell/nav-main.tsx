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

/** Buttons over the grey box of an unfolded entry: a deeper hover, and the active one deeper still. */
const IN_BOX_BUTTON =
  "hover:bg-sidebar-foreground/5 active:bg-sidebar-foreground/10 data-active:bg-sidebar-foreground/10";

export function NavMain({ items }: { items: NavigationItem[] }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const label = t(item.labelKey);
            const active = isActive(pathname, item.href);
            const QuickAccess = item.quickAccess;
            // Kept unfolded in the section, and on mobile, where nothing hovers.
            const unfolded = active || isMobile;
            return (
              <SidebarMenuItem
                key={item.href}
                className={cn(
                  QuickAccess && "rounded-md transition-colors",
                  QuickAccess &&
                    (unfolded ? "bg-sidebar-accent" : "hover:bg-sidebar-accent focus-within:bg-sidebar-accent"),
                )}
              >
                <SidebarMenuButton
                  isActive={active}
                  tooltip={label}
                  className={cn(QuickAccess && IN_BOX_BUTTON)}
                  render={
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
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
                        : "grid-rows-[0fr] group-focus-within/menu-item:grid-rows-[1fr] group-hover/menu-item:grid-rows-[1fr] group-hover/menu-item:delay-150",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <QuickAccess onNavigate={() => setOpenMobile(false)} buttonClassName={IN_BOX_BUTTON} />
                    </div>
                  </div>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

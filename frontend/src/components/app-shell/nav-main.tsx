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
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={label}
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
                  // Unfolded on hover, after a short delay so that the pointer passing by does not move the
                  // entries below, and kept open in the section and on mobile, where nothing hovers.
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                      active || isMobile
                        ? "grid-rows-[1fr]"
                        : "grid-rows-[0fr] group-focus-within/menu-item:grid-rows-[1fr] group-hover/menu-item:grid-rows-[1fr] group-hover/menu-item:delay-150",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <QuickAccess onNavigate={() => setOpenMobile(false)} />
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

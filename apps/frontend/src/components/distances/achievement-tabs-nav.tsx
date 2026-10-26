"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@kilotrace/ui/components/sidebar";
import {
  ACHIEVEMENT_TAB_ICONS,
  ACHIEVEMENT_TABS,
  achievementTabHref,
  achievementTabOf,
} from "@/config/achievement-tabs";
import type { QuickAccessProps } from "@/config/navigation";
import { routes } from "@/config/routes";

/** Quick access to the tabs of the achievements page, under its entry in the navigation. */
export function AchievementTabsNav({ onNavigate }: QuickAccessProps) {
  const t = useTranslations("distances.tabs");
  const onPage = usePathname() === routes.achievements;
  const current = achievementTabOf(useSearchParams());

  return (
    <SidebarMenu>
      {ACHIEVEMENT_TABS.map((tab) => {
        const Icon = ACHIEVEMENT_TAB_ICONS[tab];
        const label = t(tab);
        const active = onPage && tab === current;
        return (
          <SidebarMenuItem key={tab}>
            <SidebarMenuButton
              isActive={active}
              tooltip={label}
              render={
                <Link
                  href={achievementTabHref(tab)}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  onClick={onNavigate}
                />
              }
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

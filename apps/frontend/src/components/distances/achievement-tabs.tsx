"use client";

import { useTranslations } from "next-intl";
import { UnderlineTabs } from "@kilotrace/ui/components/ui/underline-tabs";
import {
  ACHIEVEMENT_TAB_ICONS,
  ACHIEVEMENT_TABS,
  achievementTabHref,
  type AchievementTab,
} from "@/config/achievement-tabs";

/** First-level tabs of the achievements page; the tab is kept in the address. */
export function AchievementTabs({ value }: { value: AchievementTab }) {
  const t = useTranslations("distances.tabs");
  return (
    <UnderlineTabs
      value={value}
      label={t("label")}
      icons={ACHIEVEMENT_TAB_ICONS}
      tabs={ACHIEVEMENT_TABS.map((tab) => ({ id: tab, label: t(tab), href: achievementTabHref(tab) }))}
    />
  );
}

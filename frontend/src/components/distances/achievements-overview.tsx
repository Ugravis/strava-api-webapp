"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ACHIEVEMENT_TAB_ICONS, achievementTabOf, showsDistanceBadges } from "@/config/achievement-tabs";
import { AchievementTabs } from "./achievement-tabs";
import { DistancesOverview } from "./distances-overview";

/** The achievements page: its tabs, then the badges of the tab selected. */
export function AchievementsOverview() {
  const t = useTranslations("distances.tabs");
  const tab = achievementTabOf(useSearchParams());
  const Icon = ACHIEVEMENT_TAB_ICONS[tab];

  return (
    <div className="flex flex-col gap-4">
      <AchievementTabs value={tab} />
      {showsDistanceBadges(tab) ? (
        <DistancesOverview />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
          <Icon aria-hidden className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      )}
    </div>
  );
}

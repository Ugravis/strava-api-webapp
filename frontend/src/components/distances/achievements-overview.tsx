"use client";

import { useSearchParams } from "next/navigation";
import { achievementTabOf } from "@/config/achievement-tabs";
import { AchievementTabs } from "./achievement-tabs";
import { DistancesOverview } from "./distances-overview";

/** The achievements page: its tabs, then the badges of the tab selected. */
export function AchievementsOverview() {
  const tab = achievementTabOf(useSearchParams());

  return (
    <div className="flex flex-col gap-4">
      <AchievementTabs value={tab} />
      <DistancesOverview tab={tab} />
    </div>
  );
}

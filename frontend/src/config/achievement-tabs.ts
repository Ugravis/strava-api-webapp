import { LayoutGridIcon, MilestoneIcon, MountainIcon, TargetIcon, TimerIcon, type LucideIcon } from "lucide-react";
import { routes } from "./routes";

/** First-level tabs of the achievements page, in display order. New badge kinds only need a tab declared here. */
export const ACHIEVEMENT_TABS = ["all", "challenges", "distance", "time", "elevation"] as const;

export type AchievementTab = (typeof ACHIEVEMENT_TABS)[number];

/** Tab shown without `?tab=`. */
export const DEFAULT_ACHIEVEMENT_TAB: AchievementTab = "all";

export const ACHIEVEMENT_TAB_ICONS: Record<AchievementTab, LucideIcon> = {
  all: LayoutGridIcon,
  challenges: TargetIcon,
  distance: MilestoneIcon,
  time: TimerIcon,
  elevation: MountainIcon,
};

/** Search parameter keeping the tab in the address. */
const TAB_PARAM = "tab";

/** The tab named by `?tab=`, the default one when missing or unknown. */
export function achievementTabOf(params: URLSearchParams): AchievementTab {
  const value = params.get(TAB_PARAM);
  return ACHIEVEMENT_TABS.find((tab) => tab === value) ?? DEFAULT_ACHIEVEMENT_TAB;
}

/** The address of the achievements page opened on `tab`. */
export function achievementTabHref(tab: AchievementTab): string {
  return tab === DEFAULT_ACHIEVEMENT_TAB ? routes.distances : `${routes.distances}?${TAB_PARAM}=${tab}`;
}

/** Whether the distance badges, and their favorites, belong to `tab`. */
export function showsDistanceBadges(tab: AchievementTab): boolean {
  return tab === "all" || tab === "distance";
}

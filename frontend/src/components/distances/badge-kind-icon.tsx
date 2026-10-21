import type { LucideProps } from "lucide-react";
import { createElement } from "react";
import { ACHIEVEMENT_TAB_ICONS, achievementKindOf } from "@/config/achievement-tabs";
import type { BadgeMetric } from "@/lib/api/types";

/** Icon of the kind of a badge (challenge, distance, time, elevation), that of its tab. */
export function BadgeKindIcon({ metric, ...props }: LucideProps & { metric: BadgeMetric }) {
  return createElement(ACHIEVEMENT_TAB_ICONS[achievementKindOf(metric)], { "aria-hidden": true, ...props });
}

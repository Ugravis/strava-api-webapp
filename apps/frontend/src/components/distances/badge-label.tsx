import { useFormatter, useTranslations } from "next-intl";
import { achievementKindOf } from "@/config/achievement-tabs";
import { useAmount } from "./use-amount";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeKindIcon } from "./badge-kind-icon";
import { progressTier } from "./progress-tier";

interface BadgeLabelProps {
  badge: DistanceBadge;
  /** Tells the family of the badge to screen readers, where badges of several families mix. */
  withFamily?: boolean;
  /** Centered under the medal, or aligned beside it. */
  align?: "center" | "start";
  /** On a background of its own: the text takes its color, set by the card. */
  onBackground?: boolean;
  /** Marks the kind of badge (challenge, distance…), where kinds mix. */
  showKind?: boolean;
}

/** Name of a badge, its progress and its target, under or beside its medal. */
export function BadgeLabel({ badge, withFamily, align = "center", onBackground, showKind }: BadgeLabelProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const amount = useAmount();
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <span className={cn("flex min-w-0 flex-col", align === "center" ? "text-center" : "text-left")}>
      <span className="line-clamp-2 text-xs leading-tight font-medium">
        {badge.name}
      </span>
      <span
        className={cn(
          "text-xs tabular-nums",
          onBackground ? "opacity-80" : "text-muted-foreground",
        )}
      >
        {showKind && <BadgeKindIcon metric={badge.metric} className="mr-1 inline size-3 align-[-2px]" />}
        <span className={cn("font-medium", onBackground ? "font-semibold" : tier.text)}>{percent}</span>
        {" · "}
        {amount(badge.metric, badge.goal)}
      </span>
      <span className="sr-only">
        {showKind && `${t(`tabs.${achievementKindOf(badge.metric)}`)}, `}
        {withFamily && `${t(`families.${badge.family}`)}, `}
        {badge.tiers ? t("level", { level: badge.completions }) : t("completions", { count: badge.completions })}
        {badge.favoritePosition !== null && `, ${t("favorite")}`}
        {badge.onProfile && `, ${t("onProfile")}`}
      </span>
    </span>
  );
}

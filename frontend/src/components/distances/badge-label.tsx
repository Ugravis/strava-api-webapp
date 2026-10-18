import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { progressTier } from "./progress-tier";

interface BadgeLabelProps {
  badge: DistanceBadge;
  /** Tells the family of the badge to screen readers, where badges of several families mix. */
  withFamily?: boolean;
}

/** Name of a badge, its progress and its distance, under its medal. */
export function BadgeLabel({ badge, withFamily }: BadgeLabelProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <span className="flex flex-col text-center">
      <span className="text-xs leading-tight font-medium">{badge.name}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        <span className={cn("font-medium", tier.text)}>{percent}</span>
        {" · "}
        {format.number(badge.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
      </span>
      <span className="sr-only">
        {withFamily && `${t(`families.${badge.family}`)}, `}
        {t("completions", { count: badge.completions })}
        {badge.favoritePosition !== null && `, ${t("favorite")}`}
      </span>
    </span>
  );
}

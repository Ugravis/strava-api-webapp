"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { useFormatter, useTranslations } from "next-intl";
import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { progressTier } from "./progress-tier";
import { useRevealed } from "./use-revealed";

/** Progress of the current iteration of a badge, filling up from zero when it appears. */
export function BadgeProgressBar({ badge }: { badge: DistanceBadge }) {
  const t = useTranslations("distances.dialog");
  const format = useFormatter();
  const [ref, revealed] = useRevealed<HTMLDivElement>();
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const share = Math.floor(badge.progress * 100) / 100;
  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 });

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={revealed ? share * 100 : 0}
      aria-label={t("progressLabel")}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          {badge.completions > 0 ? t("iteration", { number: badge.completions + 1 }) : t("firstIteration")}
        </span>
        <span className={cn("font-semibold tabular-nums", tier.text)}>{format.number(share, { style: "percent" })}</span>
      </div>
      <ProgressTrack className="h-2">
        <ProgressIndicator
          className={cn("duration-1000 ease-out motion-reduce:transition-none", tier.fill)}
        />
      </ProgressTrack>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("covered", { covered: km(badge.progress * badge.distanceM), distance: km(badge.distanceM) })}
      </p>
    </ProgressPrimitive.Root>
  );
}

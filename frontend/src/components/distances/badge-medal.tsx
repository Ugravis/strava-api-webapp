"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";
import { ProgressRing } from "./progress-ring";
import { progressTier } from "./progress-tier";

export interface BadgeMedalProps {
  badge: DistanceBadge;
  /** Rank in its group, to stagger the filling of the rings. */
  index: number;
  /** Width of the medal. */
  className?: string;
}

/** Wait between two rings of a group filling up, and at most before the last one. */
const STAGGER_MS = 60;
const MAX_DELAY_MS = 600;

/** Icon of a badge ringed by the progress of its current iteration, with its completions. */
export function BadgeMedal({ badge, index, className }: BadgeMedalProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const achieved = badge.completions > 0;
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <ProgressRing
      value={badge.progress}
      label={t("progressLabel", { name: badge.name, percent })}
      indicatorClassName={progressTier(badge.progress).stroke}
      delayMs={Math.min(index * STAGGER_MS, MAX_DELAY_MS)}
      className={className}
    >
      <div
        className={cn(
          "grid size-[72%] place-items-center rounded-full transition-colors",
          achieved ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70",
        )}
      >
        <BadgeIcon icon={badge.icon} className="size-[42%]" strokeWidth={1.75} aria-hidden />
      </div>
      {achieved && (
        <span
          className="absolute -top-1 -right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-card"
          aria-hidden
        >
          ×{format.number(badge.completions)}
        </span>
      )}
    </ProgressRing>
  );
}

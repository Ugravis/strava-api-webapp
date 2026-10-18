"use client";

import { PinIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";
import { FamilyIcon } from "./family-icon";
import { ProgressRing } from "./progress-ring";
import { progressTier } from "./progress-tier";

export interface BadgeMedalProps {
  badge: DistanceBadge;
  /** Rank in its group, to stagger the filling of the rings. */
  index: number;
  size?: "default" | "lg";
  /** Marks the badge when pinned. */
  showPin?: boolean;
  /** Marks the family of sports, where badges of several families mix. */
  showFamily?: boolean;
  className?: string;
}

/** Wait between two rings of a group filling up, and at most before the last one. */
const STAGGER_MS = 60;
const MAX_DELAY_MS = 600;

/** Icon of a badge ringed by the progress of its current iteration, with its completions. */
export function BadgeMedal({ badge, index, size = "default", showPin, showFamily, className }: BadgeMedalProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const achieved = badge.completions > 0;
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });
  const corner = "absolute grid size-5 place-items-center rounded-full bg-card text-foreground ring-1 ring-border";

  return (
    <ProgressRing
      value={badge.progress}
      label={t("progressLabel", { name: badge.name, percent })}
      indicatorClassName={tier.stroke}
      delayMs={Math.min(index * STAGGER_MS, MAX_DELAY_MS)}
      className={cn(size === "lg" ? "w-16 sm:w-18" : "w-12 sm:w-14", className)}
    >
      <div
        className={cn(
          "grid size-[72%] place-items-center rounded-full transition-colors",
          achieved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        <BadgeIcon icon={badge.icon} className="size-1/2" strokeWidth={1.75} aria-hidden />
      </div>
      {achieved && (
        <span
          className="absolute -top-1 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-card"
          aria-hidden
        >
          ×{format.number(badge.completions)}
        </span>
      )}
      {showPin && badge.pinPosition !== null && (
        <span className={cn(corner, "-top-1 -left-1")} aria-hidden>
          <PinIcon className="size-3" />
        </span>
      )}
      {showFamily && (
        <span className={cn(corner, "-bottom-0.5 -left-1 size-6")} title={t(`families.${badge.family}`)} aria-hidden>
          <FamilyIcon family={badge.family} className="size-3.5" />
        </span>
      )}
    </ProgressRing>
  );
}

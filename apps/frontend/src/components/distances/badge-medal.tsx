"use client";

import { StarIcon, UserRoundIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";
import { FamilyIcon } from "./family-icon";
import { ProgressRing } from "./progress-ring";
import { progressTier } from "./progress-tier";

/** What a medal shows of a badge: the favorite and profile marks are optional, missing on other profiles. */
export type MedalBadge = Pick<DistanceBadge, "name" | "icon" | "family" | "tiers" | "completions" | "progress"> &
  Partial<Pick<DistanceBadge, "favoritePosition" | "onProfile">>;

export interface BadgeMedalProps {
  badge: MedalBadge;
  /** Rank in its group, to stagger the filling of the rings. */
  index: number;
  /** Marks the badge when a favorite. */
  showFavorite?: boolean;
  /** Marks the family of sports, where badges of several families mix. */
  showFamily?: boolean;
  className?: string;
}

/** Wait between two rings of a group filling up, and at most before the last one. */
const STAGGER_MS = 60;
const MAX_DELAY_MS = 600;

/** Icon of a badge ringed by the progress of its current iteration or tier, with its completions or level. */
export function BadgeMedal({ badge, index, showFavorite, showFamily, className }: BadgeMedalProps) {
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
      className={cn("w-12 sm:w-14", className)}
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
          {badge.tiers ? t("level", { level: badge.completions }) : `×${format.number(badge.completions)}`}
        </span>
      )}
      {showFavorite && badge.favoritePosition != null && (
        <span className={cn(corner, "-top-1 -left-1")} aria-hidden>
          <StarIcon className="size-3 fill-amber-400 text-amber-500" />
        </span>
      )}
      {badge.onProfile && (
        <span className={cn(corner, "-right-1 -bottom-0.5")} title={t("onProfile")} aria-hidden>
          <UserRoundIcon className="size-3" />
        </span>
      )}
      {showFamily && (
        <span className={cn(corner, "-bottom-0.5 -left-1")} title={t(`families.${badge.family}`)} aria-hidden>
          <FamilyIcon family={badge.family} className="size-3" />
        </span>
      )}
    </ProgressRing>
  );
}

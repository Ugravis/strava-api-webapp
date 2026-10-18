"use client";

import { PinIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";
import { ProgressRing } from "./progress-ring";
import { progressTier } from "./progress-tier";

interface BadgeButtonProps {
  badge: DistanceBadge;
  /** Rank in its group, to stagger the filling of the rings. */
  index: number;
  /** Marks the badge when pinned; off where only pinned badges are listed. */
  showPin?: boolean;
  onOpen: (badgeId: string) => void;
}

/** Wait between two rings of a group filling up, and at most before the last one. */
const STAGGER_MS = 60;
const MAX_DELAY_MS = 600;

/** Round badge ringed by the progress of its current iteration, opening its details. */
export function BadgeButton({ badge, index, showPin = true, onOpen }: BadgeButtonProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const achieved = badge.completions > 0;
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        className="group flex w-full flex-col items-center gap-1.5 rounded-lg p-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ProgressRing
          value={badge.progress}
          label={t("progressLabel", { name: badge.name, percent })}
          indicatorClassName={tier.stroke}
          delayMs={Math.min(index * STAGGER_MS, MAX_DELAY_MS)}
          className="w-12 transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none sm:w-14"
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
          {showPin && badge.pinnedAt && (
            <span
              className="absolute -top-1 -left-1 grid size-5 place-items-center rounded-full bg-card text-foreground ring-1 ring-border"
              aria-hidden
            >
              <PinIcon className="size-3" />
            </span>
          )}
        </ProgressRing>
        <span className="flex flex-col">
          <span className="text-xs leading-tight font-medium">{badge.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className={cn("font-medium", tier.text)}>{percent}</span>
            {" · "}
            {format.number(badge.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
          </span>
          <span className="sr-only">
            {t("completions", { count: badge.completions })}
            {badge.pinnedAt && `, ${t("pinned")}`}
          </span>
        </span>
      </button>
    </li>
  );
}

"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { BadgeMedal, type BadgeMedalProps } from "./badge-medal";
import { progressTier } from "./progress-tier";

interface BadgeButtonProps extends Omit<BadgeMedalProps, "className"> {
  onOpen: (badgeId: string) => void;
  /** Leaves the badge shown but closed to clicks, e.g. while reordering. */
  disabled?: boolean;
  /** Controls shown under the badge. */
  children?: ReactNode;
}

/** A badge with its name and progress, opening its details. */
export function BadgeButton({ badge, onOpen, disabled, children, ...medal }: BadgeButtonProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <li className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        disabled={disabled}
        aria-haspopup="dialog"
        className="group flex w-full flex-col items-center gap-1.5 rounded-lg p-1 text-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default"
      >
        <BadgeMedal
          badge={badge}
          {...medal}
          className="transition-transform group-enabled:group-hover:scale-105 group-enabled:group-active:scale-95 motion-reduce:transition-none"
        />
        <span className="flex flex-col">
          <span className="text-xs leading-tight font-medium">{badge.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className={cn("font-medium", tier.text)}>{percent}</span>
            {" · "}
            {format.number(badge.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
          </span>
          <span className="sr-only">
            {medal.showFamily && `${t(`families.${badge.family}`)}, `}
            {t("completions", { count: badge.completions })}
            {badge.pinPosition !== null && `, ${t("pinned")}`}
          </span>
        </span>
      </button>
      {children}
    </li>
  );
}

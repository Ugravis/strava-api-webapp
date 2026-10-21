"use client";

import { StarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeBar } from "./badge-bar";
import { BadgeMedal } from "./badge-medal";
import { remainingM } from "./badge-view";
import { progressTier } from "./progress-tier";

/** Look of a badge: details beside its medal, under it, or a bare progress bar. */
export type BadgeLayout = "card" | "tile" | "compact";

/** Frame of every badge card, also used while reordering. */
export const BADGE_CARD_CLASS = "rounded-2xl bg-card ring-1 ring-foreground/8";

/** Arrangement of the content of a badge card, for each layout. */
export const BADGE_LAYOUT_CLASS: Record<BadgeLayout, string> = {
  card: "flex-row items-center gap-3 p-3 text-left",
  tile: "flex-col items-center gap-2 px-2 py-3 text-center",
  compact: "flex-col gap-1.5 rounded-xl p-2.5 text-left",
};

export interface BadgeCardContentProps {
  badge: DistanceBadge;
  layout: BadgeLayout;
  /** Rank in its group, to stagger the filling of the rings. */
  index: number;
  /** Marks the badge when a favorite. */
  showFavorite?: boolean;
  /** Names the family of sports, where badges of several families mix. */
  showFamily?: boolean;
}

function FavoriteStar() {
  return <StarIcon className="size-3 flex-none fill-amber-400 text-amber-500" aria-hidden />;
}

/** Medal or progress bar of a badge with its name, progress and distance, laid out for its card. */
export function BadgeCardContent({ badge, layout, index, showFavorite, showFamily }: BadgeCardContentProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  // Rounded down: an unfinished iteration never shows 100 %.
  const share = Math.floor(badge.progress * 100) / 100;
  const tier = progressTier(badge.progress);
  const percent = format.number(share, { style: "percent" });
  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: meters < 10_000 ? 1 : 0 });
  const favorite = showFavorite && badge.favoritePosition !== null;
  const screenReader = (
    <span className="sr-only">
      {showFamily && `${t(`families.${badge.family}`)}, `}
      {t("completions", { count: badge.completions })}
      {badge.favoritePosition !== null && `, ${t("favorite")}`}
    </span>
  );

  if (layout === "compact") {
    return (
      <>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-medium">{badge.name}</span>
          {favorite && <FavoriteStar />}
          {badge.completions > 0 && (
            <span
              className="ml-auto flex-none rounded-full bg-primary px-1.5 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums"
              aria-hidden
            >
              ×{format.number(badge.completions)}
            </span>
          )}
        </span>
        <BadgeBar value={share} label={t("progressLabel", { name: badge.name, percent })} fillClassName={tier.fill} className="h-1" />
        <span className="flex items-baseline gap-1 tabular-nums">
          <span className={cn("text-xs font-semibold", tier.text)}>{percent}</span>
          <span className="truncate text-xs text-muted-foreground">{t("card.of", { distance: km(badge.distanceM) })}</span>
        </span>
        {screenReader}
      </>
    );
  }

  const tile = layout === "tile";
  return (
    <>
      <BadgeMedal
        badge={badge}
        index={index}
        className={cn(
          "flex-none transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none",
          tile ? "w-14" : "w-12",
        )}
      />
      <span className={cn("flex min-w-0 flex-col", tile ? "items-center" : "flex-1 gap-0.5")}>
        <span className="flex min-w-0 items-center gap-1 text-sm leading-tight font-medium">
          <span className={cn(!tile && "truncate")}>{badge.name}</span>
          {favorite && <FavoriteStar />}
        </span>
        {tile && showFamily && (
          <span className="text-xs text-muted-foreground" aria-hidden>
            {t(`families.${badge.family}`)}
          </span>
        )}
        <span className={cn("flex items-baseline gap-1 tabular-nums", tile && "mt-1")}>
          <span className={cn("text-sm font-semibold", tier.text)}>{percent}</span>
          {!tile && (
            <span className="truncate text-xs text-muted-foreground">{t("card.of", { distance: km(badge.distanceM) })}</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t(tile ? "card.left" : "card.remaining", { distance: km(remainingM(badge)) })}
        </span>
      </span>
      {screenReader}
    </>
  );
}

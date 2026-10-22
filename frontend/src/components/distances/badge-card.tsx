"use client";

import { StarIcon, UserRoundIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { achievementKindOf } from "@/config/achievement-tabs";
import type { DistanceBadge } from "@/lib/api/types";
import { lightTextOn } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";
import { BadgeKindIcon } from "./badge-kind-icon";
import { BadgeLabel } from "./badge-label";
import { BadgeMedal, type BadgeMedalProps } from "./badge-medal";
import { BadgeMiniBar } from "./badge-mini-bar";
import { progressTier } from "./progress-tier";
import { useAmount } from "./use-amount";

/** How a card lays out a badge: medal over its details, beside them, or details only. */
export type BadgeCardLayout = "vertical" | "horizontal" | "compact";

/** Classes and style of the card of a badge, with its own background if any. */
export function badgeCardSurface(badge: DistanceBadge): { className: string; style?: CSSProperties } {
  const { background } = badge;
  if (!background) return { className: "bg-card text-card-foreground ring-1 ring-foreground/10" };
  const text = lightTextOn(background) ? "text-white" : "text-zinc-950";
  if (background.kind === "color") {
    return { className: cn("ring-1 ring-black/10", text), style: { backgroundColor: background.color } };
  }
  return {
    className: cn("bg-cover bg-center ring-1 ring-black/10", text),
    // Darkened for the text to read whatever the image.
    style: { backgroundImage: `linear-gradient(rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.45)), url("${background.url}")` },
  };
}

/** Medal and details of a badge laid out as a card asks; compact, the details without the medal. */
export function BadgeCardContent({
  badge,
  layout,
  showKind,
  ...medal
}: Omit<BadgeMedalProps, "className" | "badge"> & { badge: DistanceBadge; layout: BadgeCardLayout; showKind?: boolean }) {
  if (layout === "compact") {
    return <CompactBadgeContent badge={badge} showFavorite={medal.showFavorite} showKind={showKind} />;
  }
  const horizontal = layout === "horizontal";
  return (
    <>
      <BadgeMedal
        badge={badge}
        {...medal}
        className={cn(
          "shrink-0 transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none",
          horizontal && "w-11 sm:w-11",
        )}
      />
      <BadgeLabel
        badge={badge}
        withFamily={medal.showFamily}
        align={horizontal ? "start" : "center"}
        onBackground={badge.background !== null}
        showKind={showKind}
      />
    </>
  );
}

/** Name, progress bar, share and target of a badge, with its completions or level and its favorite mark. */
function CompactBadgeContent({
  badge,
  showFavorite,
  showKind,
}: {
  badge: DistanceBadge;
  showFavorite?: boolean;
  showKind?: boolean;
}) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const amount = useAmount();
  const onBackground = badge.background !== null;
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });
  const favorite = showFavorite && badge.favoritePosition !== null;
  const pill = cn(
    "flex h-4.5 shrink-0 items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
    onBackground ? "bg-black/15" : "bg-muted",
  );

  return (
    <span className="flex w-full min-w-0 flex-col gap-1.5 text-left">
      <span className="flex min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{badge.name}</span>
        {showKind && (
          <span className={cn(pill, "px-1")} aria-hidden>
            <BadgeKindIcon metric={badge.metric} className="size-2.5" />
          </span>
        )}
        {badge.onProfile && (
          <span className={cn(pill, "px-1")} aria-hidden>
            <UserRoundIcon className="size-2.5" />
          </span>
        )}
        {badge.completions > 0 && (
          <span className={pill} aria-hidden>
            {badge.tiers ? t("level", { level: badge.completions }) : `×${format.number(badge.completions)}`}
          </span>
        )}
        {favorite && (
          <span className={cn(pill, "px-1")} aria-hidden>
            <StarIcon className="size-2.5 fill-amber-400 text-amber-500" />
          </span>
        )}
      </span>
      <BadgeMiniBar value={badge.progress} className={onBackground ? "bg-black/15" : undefined} />
      <span className={cn("text-[11px] tabular-nums", onBackground ? "opacity-80" : "text-muted-foreground")}>
        <span className={cn("font-medium", onBackground ? "font-semibold" : tier.text)}>{percent}</span>
        {" · "}
        {amount(badge.metric, badge.goal)}
      </span>
      <span className="sr-only">
        {showKind && `${t(`tabs.${achievementKindOf(badge.metric)}`)}, `}
        {badge.tiers ? t("level", { level: badge.completions }) : t("completions", { count: badge.completions })}
        {favorite && `, ${t("favorite")}`}
        {badge.onProfile && `, ${t("onProfile")}`}
      </span>
    </span>
  );
}

/** Classes laying out the content of a card. */
export const BADGE_CARD_LAYOUT_CLASS: Record<BadgeCardLayout, string> = {
  vertical: "flex-col items-center gap-1.5 px-2.5 py-4",
  horizontal: "flex-row items-center gap-2.5 p-2.5",
  compact: "flex-col p-2",
};

interface BadgeCardProps extends Omit<BadgeMedalProps, "className" | "badge"> {
  badge: DistanceBadge;
  layout: BadgeCardLayout;
  onOpen: (badgeId: string) => void;
  /** Outlines the badge, e.g. once found by the search. */
  highlighted?: boolean;
  /** Marks the badge as the one the search scrolls to. */
  anchor?: boolean;
  /** Classes of the list item, e.g. its width in a row. */
  className?: string;
  /** Marks the kind of badge (challenge, distance…), where kinds mix. */
  showKind?: boolean;
}

/** A badge in its card, with its name and progress, opening its details. */
export function BadgeCard({ badge, layout, onOpen, highlighted, anchor, className, ...medal }: BadgeCardProps) {
  const surface = badgeCardSurface(badge);
  return (
    <li className={cn("flex min-w-0", className)} data-badge-anchor={anchor ? badge.id : undefined}>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        style={surface.style}
        className={cn(
          "group flex w-full min-w-0 rounded-xl outline-none transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
          BADGE_CARD_LAYOUT_CLASS[layout],
          surface.className,
          highlighted && "ring-2 ring-primary",
        )}
      >
        <BadgeCardContent badge={badge} layout={layout} {...medal} />
      </button>
    </li>
  );
}

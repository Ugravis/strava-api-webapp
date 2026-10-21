"use client";

import type { CSSProperties } from "react";
import type { DistanceBadge } from "@/lib/api/types";
import { lightTextOn } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";
import { BadgeLabel } from "./badge-label";
import { BadgeMedal, type BadgeMedalProps } from "./badge-medal";

/** How a card lays out a badge: medal over its details, beside them, or with its name only. */
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

/** Medal and details of a badge laid out as a card asks. */
export function BadgeCardContent({
  badge,
  layout,
  ...medal
}: Omit<BadgeMedalProps, "className"> & { layout: BadgeCardLayout }) {
  const horizontal = layout === "horizontal";
  return (
    <>
      <BadgeMedal
        badge={badge}
        {...medal}
        className={cn(
          "shrink-0 transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none",
          horizontal ? "w-11 sm:w-11" : layout === "compact" && "w-10 sm:w-11",
        )}
      />
      <BadgeLabel
        badge={badge}
        withFamily={medal.showFamily}
        align={horizontal ? "start" : "center"}
        compact={layout === "compact"}
        onBackground={badge.background !== null}
      />
    </>
  );
}

/** Classes laying out the content of a card. */
export const BADGE_CARD_LAYOUT_CLASS: Record<BadgeCardLayout, string> = {
  vertical: "flex-col items-center gap-1.5 p-2.5",
  horizontal: "flex-row items-center gap-2.5 p-2.5",
  compact: "flex-col items-center gap-1 p-1.5",
};

interface BadgeCardProps extends Omit<BadgeMedalProps, "className"> {
  layout: BadgeCardLayout;
  onOpen: (badgeId: string) => void;
  /** Outlines the badge, e.g. once found by the search. */
  highlighted?: boolean;
  /** Marks the badge as the one the search scrolls to. */
  anchor?: boolean;
}

/** A badge in its card, with its name and progress, opening its details. */
export function BadgeCard({ badge, layout, onOpen, highlighted, anchor, ...medal }: BadgeCardProps) {
  const surface = badgeCardSurface(badge);
  return (
    <li className="flex min-w-0" data-badge-anchor={anchor ? badge.id : undefined}>
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

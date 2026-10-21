"use client";

import { cn } from "@/lib/utils";
import { BADGE_CARD_CLASS, BADGE_LAYOUT_CLASS, BadgeCardContent, type BadgeCardContentProps } from "./badge-card-content";

interface BadgeButtonProps extends BadgeCardContentProps {
  onOpen: (badgeId: string) => void;
  /** Outlines the badge, e.g. once found by the search. */
  highlighted?: boolean;
  /** Marks the badge as the one the search scrolls to. */
  anchor?: boolean;
}

/** A badge card, opening its details. */
export function BadgeButton({ badge, onOpen, highlighted, anchor, ...content }: BadgeButtonProps) {
  return (
    <li className="flex flex-col" data-badge-anchor={anchor ? badge.id : undefined}>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        className={cn(
          "group flex h-full w-full outline-none transition-[background-color,box-shadow] duration-700 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
          BADGE_CARD_CLASS,
          BADGE_LAYOUT_CLASS[content.layout],
          highlighted && "bg-primary/10 ring-2 ring-primary",
        )}
      >
        <BadgeCardContent badge={badge} {...content} />
      </button>
    </li>
  );
}

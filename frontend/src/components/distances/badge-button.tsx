"use client";

import { cn } from "@/lib/utils";
import { BadgeLabel } from "./badge-label";
import { BadgeMedal, type BadgeMedalProps } from "./badge-medal";

interface BadgeButtonProps extends Omit<BadgeMedalProps, "className"> {
  onOpen: (badgeId: string) => void;
  /** Outlines the badge, e.g. once found by the search. */
  highlighted?: boolean;
  /** Marks the badge as the one the search scrolls to. */
  anchor?: boolean;
}

/** A badge with its name and progress, opening its details. */
export function BadgeButton({ badge, onOpen, highlighted, anchor, ...medal }: BadgeButtonProps) {
  return (
    <li className="flex flex-col items-center" data-badge-anchor={anchor ? badge.id : undefined}>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        className={cn(
          "group flex w-full flex-col items-center gap-1.5 rounded-lg p-1 outline-none transition-[background-color,box-shadow] duration-700 focus-visible:ring-3 focus-visible:ring-ring/50",
          highlighted && "bg-primary/10 ring-2 ring-primary",
        )}
      >
        <BadgeMedal
          badge={badge}
          {...medal}
          className="transition-transform group-hover:scale-105 group-active:scale-95 motion-reduce:transition-none"
        />
        <BadgeLabel badge={badge} withFamily={medal.showFamily} />
      </button>
    </li>
  );
}

"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { type Breakpoint, useBreakpoint } from "@/hooks/use-breakpoint";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeButton } from "./badge-button";
import type { BadgeLayout } from "./badge-card-content";

/** Classes of the badge grids and their columns at each breakpoint. */
export const BADGE_GRIDS: Record<BadgeLayout, { className: string; columns: Record<Breakpoint, number> }> = {
  card: {
    className: "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    columns: { base: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  },
  tile: {
    className: "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    columns: { base: 2, sm: 3, md: 4, lg: 5, xl: 5 },
  },
  compact: {
    className: "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    columns: { base: 2, sm: 3, md: 4, lg: 5, xl: 6 },
  },
};

interface BadgeGridProps {
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  layout: BadgeLayout;
  /** Rows shown while folded, for each number of columns. */
  rows: Record<Breakpoint, number>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showFavorite?: boolean;
  showFamily?: boolean;
  /** Badge outlined, if any. */
  highlightedId?: string | null;
  /** Marks the badges as those the search scrolls to. */
  anchors?: boolean;
}

/** Badges laid out in rows, folded after a few rows with a button to show the others. */
export function BadgeGrid({
  badges,
  onOpen,
  layout,
  rows,
  expanded,
  onExpandedChange,
  showFavorite,
  showFamily,
  highlightedId,
  anchors,
}: BadgeGridProps) {
  const t = useTranslations("distances");
  const breakpoint = useBreakpoint();
  const grid = BADGE_GRIDS[layout];
  const limit = grid.columns[breakpoint] * rows[breakpoint];
  const hidden = Math.max(badges.length - limit, 0);
  const shown = expanded ? badges : badges.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <ul className={grid.className}>
        {shown.map((badge, index) => (
          <BadgeButton
            key={badge.id}
            badge={badge}
            index={index}
            layout={layout}
            showFavorite={showFavorite}
            showFamily={showFamily}
            highlighted={badge.id === highlightedId}
            anchor={anchors}
            onOpen={onOpen}
          />
        ))}
      </ul>
      {hidden > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          onClick={() => onExpandedChange(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? t("showLess") : t("showMore", { count: hidden })}
          {expanded ? <ChevronUpIcon data-icon="inline-end" /> : <ChevronDownIcon data-icon="inline-end" />}
        </Button>
      )}
    </div>
  );
}

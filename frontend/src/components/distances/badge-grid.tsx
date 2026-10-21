"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useGridColumns } from "@/hooks/use-grid-columns";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeCard, type BadgeCardLayout } from "./badge-card";

/**
 * Columns of the badge grids for each card layout, following the width of
 * the page (a `@container`) rather than of the window, the sidebar aside.
 */
export const BADGE_GRID_CLASS: Record<BadgeCardLayout, string> = {
  vertical: "grid grid-cols-3 gap-2 @md:grid-cols-4 @2xl:grid-cols-6",
  horizontal: "grid grid-cols-2 gap-2 @xl:grid-cols-3 @4xl:grid-cols-4",
  compact: "grid grid-cols-4 gap-1.5 @md:grid-cols-6 @2xl:grid-cols-8",
};

interface BadgeGridProps {
  badges: DistanceBadge[];
  layout: BadgeCardLayout;
  onOpen: (badgeId: string) => void;
  /** Rows shown while folded. */
  rows: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  showFavorite?: boolean;
  showFamily?: boolean;
  /** Badge outlined, if any. */
  highlightedId?: string | null;
  /** Marks the badges as those the search scrolls to. */
  anchors?: boolean;
}

/** Badges laid out in rows of cards, folded after a few rows with a button to show the others. */
export function BadgeGrid({
  badges,
  layout,
  onOpen,
  rows,
  expanded,
  onExpandedChange,
  showFavorite,
  showFamily,
  highlightedId,
  anchors,
}: BadgeGridProps) {
  const t = useTranslations("distances");
  const ref = useRef<HTMLUListElement>(null);
  const columns = useGridColumns(ref, layout === "horizontal" ? 2 : 3);
  const limit = columns * rows;
  const hidden = Math.max(badges.length - limit, 0);
  const shown = expanded ? badges : badges.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <ul ref={ref} className={BADGE_GRID_CLASS[layout]}>
        {shown.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            layout={layout}
            index={index}
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

"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { type GridColumns, useGridColumns } from "@/hooks/use-grid-columns";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeButton } from "./badge-button";

/** Classes of the badge grids, matching `useGridColumns`. */
export const BADGE_GRID_CLASS = "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-6";

interface BadgeGridProps {
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  /** Rows shown while folded, for each number of columns. */
  rows: Record<GridColumns, number>;
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
  rows,
  expanded,
  onExpandedChange,
  showFavorite,
  showFamily,
  highlightedId,
  anchors,
}: BadgeGridProps) {
  const t = useTranslations("distances");
  const columns = useGridColumns();
  const limit = columns * rows[columns];
  const hidden = Math.max(badges.length - limit, 0);
  const shown = expanded ? badges : badges.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <ul className={BADGE_GRID_CLASS}>
        {shown.map((badge, index) => (
          <BadgeButton
            key={badge.id}
            badge={badge}
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

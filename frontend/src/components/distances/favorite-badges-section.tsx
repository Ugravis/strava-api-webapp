"use client";

import { ArrowUpDownIcon, CheckIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";
import type { BadgeView } from "./badge-view";
import { SortableFavorites } from "./sortable-favorites";

interface FavoriteBadgesSectionProps {
  /** Favorite badges, in their order. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  onReorder: (badgeIds: string[]) => Promise<void>;
  view: BadgeView;
  highlightedId: string | null;
}

/** A single row of favorites while folded, whatever the width. */
const FOLDED_ROWS = { base: 1, sm: 1, md: 1, lg: 1, xl: 1 } as const;

/** The favorite badges of the user, first on the page and in the order they choose. */
export function FavoriteBadgesSection({ badges, onOpen, onReorder, view, highlightedId }: FavoriteBadgesSectionProps) {
  const t = useTranslations("distances.favoritesSection");
  const [reordering, setReordering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const headingId = "distances-favorites";
  const empty = badges.length === 0;
  // A single badge has no order to choose.
  const editing = reordering && badges.length > 1;
  // Cards stand upright here, unlike in the families.
  const layout = view === "cards" ? "tile" : "compact";

  const reorder = (badgeIds: string[]) => {
    onReorder(badgeIds).catch(() => toast.error(t("reorderError")));
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-7 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-amber-500 text-white" aria-hidden>
            <StarIcon className="size-3 fill-current" />
          </span>
          <h2 id={headingId} className="text-base font-semibold">
            {t("title")}
          </h2>
          {!empty && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {badges.length}
            </span>
          )}
        </div>
        {badges.length > 1 && (
          <Button
            variant={editing ? "default" : "ghost"}
            size="sm"
            onClick={() => setReordering(!editing)}
            aria-pressed={editing}
          >
            {editing ? <CheckIcon data-icon="inline-start" /> : <ArrowUpDownIcon data-icon="inline-start" />}
            {editing ? t("done") : t("reorder")}
          </Button>
        )}
      </div>
      {empty ? (
        <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-50/40 p-4 text-sm text-muted-foreground dark:bg-amber-500/5">
          {t("empty")}
        </p>
      ) : editing ? (
        <>
          <p className="text-xs text-muted-foreground">{t("reorderHint")}</p>
          <SortableFavorites badges={badges} onReorder={reorder} layout={layout} />
        </>
      ) : (
        <BadgeGrid
          badges={badges}
          onOpen={onOpen}
          layout={layout}
          rows={FOLDED_ROWS}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showFamily
          highlightedId={highlightedId}
        />
      )}
    </section>
  );
}

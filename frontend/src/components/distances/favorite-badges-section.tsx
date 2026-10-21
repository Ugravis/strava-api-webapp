"use client";

import { ArrowUpDownIcon, CheckIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DistanceBadge } from "@/lib/api/types";
import { BadgeGrid } from "./badge-grid";
import { SortableFavorites } from "./sortable-favorites";

interface FavoriteBadgesSectionProps {
  /** Favorite badges, in their order. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  onReorder: (badgeIds: string[]) => Promise<void>;
  highlightedId: string | null;
  /** Cards with the name only. */
  compact: boolean;
  /** Marks the kind of each badge, where kinds mix. */
  showKind: boolean;
}

/** The favorite badges of the user, first on the page and in the order they choose, on a single row while folded. */
export function FavoriteBadgesSection({ badges, onOpen, onReorder, highlightedId, compact, showKind }: FavoriteBadgesSectionProps) {
  const t = useTranslations("distances.favoritesSection");
  const [reordering, setReordering] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const headingId = "distances-favorites";
  const empty = badges.length === 0;
  // A single badge has no order to choose.
  const editing = reordering && badges.length > 1;

  const reorder = (badgeIds: string[]) => {
    onReorder(badgeIds).catch(() => toast.error(t("reorderError")));
  };

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex min-h-8 items-center gap-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-amber-500 text-white shadow-sm" aria-hidden>
          <StarIcon className="size-3.5 fill-current" />
        </span>
        <h2 id={headingId} className="text-base font-semibold">
          {t("title")}
        </h2>
        {!empty && (
          <span className="text-sm text-muted-foreground tabular-nums">{badges.length}</span>
        )}
        {badges.length > 1 && (
          <Button
            variant={editing ? "default" : "ghost"}
            size="sm"
            className="ml-auto"
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
          <SortableFavorites badges={badges} onReorder={reorder} />
        </>
      ) : (
        <BadgeGrid
          badges={badges}
          layout={compact ? "compact" : "vertical"}
          onOpen={onOpen}
          rows={1}
          expanded={expanded}
          onExpandedChange={setExpanded}
          showFamily
          showKind={showKind}
          highlightedId={highlightedId}
        />
      )}
    </section>
  );
}

"use client";

import { ArrowUpDownIcon, CheckIcon, StarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeGrid } from "./badge-grid";
import { SortableFavorites } from "./sortable-favorites";

interface FavoriteBadgesSectionProps {
  /** Favorite badges, in their order. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  onReorder: (badgeIds: string[]) => Promise<void>;
  highlightedId: string | null;
}

/** A single row of favorites while folded, whatever the width. */
const FOLDED_ROWS = { 3: 1, 4: 1, 6: 1 } as const;

/** The favorite badges of the user, first on the page and in the order they choose. */
export function FavoriteBadgesSection({ badges, onOpen, onReorder, highlightedId }: FavoriteBadgesSectionProps) {
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
    <section aria-labelledby={headingId}>
      <Card
        className={cn(
          empty
            ? "border border-dashed border-amber-500/40 bg-amber-50/40 ring-0 dark:bg-amber-500/5"
            : "bg-linear-to-br from-amber-100/80 via-card to-card ring-amber-500/30 dark:from-amber-500/15",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full bg-amber-500 text-white shadow-sm" aria-hidden>
              <StarIcon className="size-3.5 fill-current" />
            </span>
            <h2 id={headingId} className="text-base font-semibold">
              {t("title")}
            </h2>
            {!empty && (
              <span className="rounded-full bg-amber-500/15 px-2 text-xs font-medium text-amber-700 tabular-nums dark:text-amber-300">
                {badges.length}
              </span>
            )}
          </CardTitle>
          {empty && <CardDescription>{t("empty")}</CardDescription>}
          {badges.length > 1 && (
            <CardAction>
              <Button
                variant={editing ? "default" : "ghost"}
                size="sm"
                onClick={() => setReordering(!editing)}
                aria-pressed={editing}
              >
                {editing ? <CheckIcon data-icon="inline-start" /> : <ArrowUpDownIcon data-icon="inline-start" />}
                {editing ? t("done") : t("reorder")}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        {!empty && (
          <CardContent className="flex flex-col gap-3">
            {editing ? (
              <>
                <p className="text-xs text-muted-foreground">{t("reorderHint")}</p>
                <SortableFavorites badges={badges} onReorder={reorder} />
              </>
            ) : (
              <BadgeGrid
                badges={badges}
                onOpen={onOpen}
                rows={FOLDED_ROWS}
                expanded={expanded}
                onExpandedChange={setExpanded}
                showFamily
                highlightedId={highlightedId}
              />
            )}
          </CardContent>
        )}
      </Card>
    </section>
  );
}

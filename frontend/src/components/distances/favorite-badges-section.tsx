"use client";

import { ArrowUpDownIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon, PinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistanceBadge } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeButton } from "./badge-button";

interface PinnedBadgesSectionProps {
  /** Pinned badges, in their order. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
  onReorder: (badgeIds: string[]) => Promise<void>;
}

/** Identifiers of `badges` once the one at `from` moves to `to`. */
function moved(badges: DistanceBadge[], from: number, to: number): string[] {
  const ids = badges.map((badge) => badge.id);
  const [id] = ids.splice(from, 1);
  ids.splice(to, 0, id);
  return ids;
}

/** The favorite badges of the user, first on the page and in the order they choose. */
export function PinnedBadgesSection({ badges, onOpen, onReorder }: PinnedBadgesSectionProps) {
  const t = useTranslations("distances.pinnedSection");
  const [reordering, setReordering] = useState(false);
  const headingId = "distances-pinned";
  const empty = badges.length === 0;
  // A single badge has no order to choose.
  const editing = reordering && badges.length > 1;

  const move = (from: number, to: number) => {
    onReorder(moved(badges, from, to)).catch(() => toast.error(t("reorderError")));
  };

  return (
    <section aria-labelledby={headingId}>
      <Card
        className={cn(
          "relative",
          empty
            ? "border border-dashed border-amber-500/40 bg-amber-50/40 ring-0 dark:bg-amber-500/5"
            : "bg-linear-to-br from-amber-100/80 via-card to-card ring-amber-500/30 dark:from-amber-500/15",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full bg-amber-500 text-white shadow-sm" aria-hidden>
              <PinIcon className="size-3.5" />
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
            {editing && <p className="text-xs text-muted-foreground">{t("reorderHint")}</p>}
            <ul className="grid grid-cols-3 gap-x-2 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
              {badges.map((badge, index) => (
                <BadgeButton
                  key={badge.id}
                  badge={badge}
                  index={index}
                  size="lg"
                  showFamily
                  disabled={editing}
                  onOpen={onOpen}
                >
                  {editing && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        aria-label={t("moveBefore", { name: badge.name })}
                      >
                        <ChevronLeftIcon />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        disabled={index === badges.length - 1}
                        onClick={() => move(index, index + 1)}
                        aria-label={t("moveAfter", { name: badge.name })}
                      >
                        <ChevronRightIcon />
                      </Button>
                    </div>
                  )}
                </BadgeButton>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </section>
  );
}

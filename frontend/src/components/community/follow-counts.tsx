"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { FollowDirection } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { FollowsDialog } from "./follows-dialog";

interface FollowCountsProps {
  username: string;
  /** Null while loading. */
  counts: Record<FollowDirection, number> | null;
  /** Shows the counts without opening the lists, those of a private profile. */
  locked?: boolean;
  /** Called once the dialog closes: follows may have changed meanwhile. */
  onDialogClosed?: () => void;
  className?: string;
}

/** Counts of followers and followed users, each opening the lists in a dialog. */
export function FollowCounts({ username, counts, locked, onDialogClosed, className }: FollowCountsProps) {
  const t = useTranslations("community.counts");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<FollowDirection>("followers");
  const directions: FollowDirection[] = ["followers", "following"];

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      {directions.map((tab) =>
        counts && locked ? (
          <span key={tab} className="text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">{format.number(counts[tab])}</span>{" "}
            {t(tab, { count: counts[tab] })}
          </span>
        ) : counts ? (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setDirection(tab);
              setOpen(true);
            }}
            className="rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-semibold text-foreground tabular-nums">{format.number(counts[tab])}</span>{" "}
            {t(tab, { count: counts[tab] })}
          </button>
        ) : (
          <Skeleton key={tab} className="h-5 w-20" />
        ),
      )}
      {counts && !locked && (
        <FollowsDialog
          username={username}
          counts={counts}
          direction={direction}
          open={open}
          onDirectionChange={setDirection}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) onDialogClosed?.();
          }}
        />
      )}
    </div>
  );
}

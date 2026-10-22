"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { userFollowsHref } from "@/config/routes";
import type { FollowDirection } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface FollowCountsProps {
  username: string;
  /** Null while loading. */
  counts: Record<FollowDirection, number> | null;
  className?: string;
}

/** Counts of followers and followed users, each a link to the list. */
export function FollowCounts({ username, counts, className }: FollowCountsProps) {
  const t = useTranslations("community.counts");
  const format = useFormatter();
  const directions: FollowDirection[] = ["followers", "following"];

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      {directions.map((direction) =>
        counts ? (
          <Link
            key={direction}
            href={userFollowsHref(username, direction)}
            className="rounded-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-semibold text-foreground tabular-nums">{format.number(counts[direction])}</span>{" "}
            {t(direction, { count: counts[direction] })}
          </Link>
        ) : (
          <Skeleton key={direction} className="h-5 w-20" />
        ),
      )}
    </div>
  );
}

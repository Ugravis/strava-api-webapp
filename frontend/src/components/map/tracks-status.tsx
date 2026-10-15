"use client";

import { LoaderCircleIcon, RouteIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActivityTracksState } from "@/hooks/use-activity-tracks";

/** Floating summary: the number of tracks, or the fetching progress. */
export function TracksStatus({ lines, status, progress }: Pick<ActivityTracksState, "lines" | "status" | "progress">) {
  const t = useTranslations("map");
  if (!lines) return null;
  const syncing = status === "syncing" || status === "idle";

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      {syncing ? (
        <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        <RouteIcon className="size-3.5 text-[#fc4c02]" />
      )}
      {progress
        ? t("syncing", { fetched: progress.fetched, total: progress.total })
        : syncing
          ? t("checking")
          : t("trackCount", { count: lines.length })}
    </div>
  );
}

"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { TileActivity } from "@/lib/api/types";
import { StravaActivityLink } from "./strava-activity-link";

interface TileActivityItemProps {
  activity: TileActivity;
  onOpen: (activityId: string) => void;
}

/** One activity that crossed a tile: its sport, date and figures, and links to its details and to Strava. */
export function TileActivityItem({ activity, onOpen }: TileActivityItemProps) {
  const t = useTranslations("map.tilePanel");
  const format = useActivityFormat();
  const figures = [format.distance(activity.distanceM), format.duration(activity.movingTimeS)];
  if (activity.elevationGainM !== null && activity.elevationGainM >= 1) {
    figures.push(`${format.elevation(activity.elevationGainM)} D+`);
  }

  return (
    <li className="group/item relative -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          {/* Stretched over the whole row: the row opens the activity. */}
          <button
            type="button"
            onClick={() => onOpen(activity.id)}
            aria-label={`${t("viewActivity")} : ${activity.name}`}
            className="truncate text-left font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring/50"
          >
            {activity.name}
          </button>
          <time dateTime={activity.startedAt} className="shrink-0 text-xs text-muted-foreground">
            {format.date(activity.startedAt)}
          </time>
        </div>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {format.sport(activity.sportType)}
          {figures.map((figure) => (
            <span key={figure}> · {figure}</span>
          ))}
        </p>
        {activity.stravaId && (
          // Above the stretched button, to stay clickable.
          <span className="relative w-fit text-xs">
            <StravaActivityLink stravaId={activity.stravaId} />
          </span>
        )}
      </div>
      <ChevronRightIcon
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/item:translate-x-0.5"
        aria-hidden
      />
    </li>
  );
}

"use client";

import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-medium">{activity.name}</p>
        <time dateTime={activity.startedAt} className="shrink-0 text-xs text-muted-foreground">
          {format.date(activity.startedAt)}
        </time>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {format.sport(activity.sportType)}
        {figures.map((figure) => (
          <span key={figure}> · {figure}</span>
        ))}
      </p>
      <div className="flex items-center justify-between gap-3 text-xs">
        <Button variant="outline" size="xs" onClick={() => onOpen(activity.id)}>
          {t("viewActivity")}
          <ChevronRightIcon data-icon="inline-end" aria-hidden />
        </Button>
        {activity.stravaId && <StravaActivityLink stravaId={activity.stravaId} />}
      </div>
    </li>
  );
}

"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityDetails } from "@/hooks/use-activity";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { ActivityTiles } from "@/lib/api/types";
import { PanelFigure, PanelFiguresSkeleton } from "./panel-figure";
import { StravaActivityLink } from "./strava-activity-link";

interface ActivityPanelProps {
  activityId: string;
  /** Tiles crossed by the activity, drawn on the map; null while loading. */
  tiles: ActivityTiles | null;
}

/** Content of the panel for an activity: its figures and the tiles it crossed, drawn in pink on the map. */
export function ActivityPanel({ activityId, tiles }: ActivityPanelProps) {
  const t = useTranslations("map.activityPanel");
  const format = useActivityFormat();
  const formatter = useFormatter();
  const { activity, error } = useActivityDetails(activityId);

  if (error) {
    return <p className="text-muted-foreground">{t("error")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        {activity ? (
          <>
            <h2 className="font-heading text-base font-medium break-words">{activity.name}</h2>
            <p className="text-muted-foreground">
              {format.sport(activity.sportType)} ·{" "}
              <time dateTime={activity.startedAt}>
                {formatter.dateTime(new Date(activity.startedAt), {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: activity.timezone ?? undefined,
                })}
              </time>
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-56" />
          </>
        )}
      </header>

      {activity ? (
        <dl className="grid grid-cols-3 gap-3">
          <PanelFigure label={t("distance")} value={format.distance(activity.distanceM)} />
          <PanelFigure label={t("movingTime")} value={format.duration(activity.movingTimeS)} />
          <PanelFigure
            label={t("elevation")}
            value={activity.elevationGainM !== null ? format.elevation(activity.elevationGainM) : "–"}
          />
        </dl>
      ) : (
        <PanelFiguresSkeleton count={3} />
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("tilesTitle")}</h3>
        {tiles ? (
          <dl className="grid grid-cols-3 gap-3">
            <PanelFigure label={t("tiles")} value={formatter.number(tiles.tiles.length)} />
            <PanelFigure label={t("subtiles")} value={formatter.number(tiles.subtiles.length)} />
          </dl>
        ) : (
          <PanelFiguresSkeleton count={2} />
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-3 shrink-0 rounded-sm bg-[#db2777]/70 ring-1 ring-[#db2777]" aria-hidden />
          {t("legend")}
        </p>
      </section>

      {activity?.stravaId && (
        <p className="text-xs">
          <StravaActivityLink stravaId={activity.stravaId} />
        </p>
      )}
    </div>
  );
}

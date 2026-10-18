"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useActivityDetails } from "@/hooks/use-activity";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { ActivityTiles, LevelGains } from "@/lib/api/types";
import { PanelFigure, PanelFiguresSkeleton } from "./panel-figure";
import { StravaActivityLink } from "./strava-activity-link";

interface ActivityPanelProps {
  activityId: string;
  /** Tiles crossed by the activity, drawn on the map; null while loading. */
  tiles: ActivityTiles | null;
  /** Whether the map draws only the tiles the activity gained. */
  gainedOnly: boolean;
  onGainedOnlyChange: (gainedOnly: boolean) => void;
}

/**
 * Content of the panel for an activity: its figures, what it gained when it
 * was recorded, and its tiles, drawn in pink on the map.
 */
export function ActivityPanel({ activityId, tiles, gainedOnly, onGainedOnlyChange }: ActivityPanelProps) {
  const t = useTranslations("map.activityPanel");
  const format = useActivityFormat();
  const formatter = useFormatter();
  const { activity, error } = useActivityDetails(activityId);
  const switchId = useId();

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

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("gainsTitle")}</h3>
        {!tiles ? (
          <PanelFiguresSkeleton count={3} />
        ) : tiles.gains ? (
          <>
            <LevelGainsFigures title={t("tiles")} crossed={tiles.tiles.length} gains={tiles.gains.tiles} />
            <LevelGainsFigures title={t("subtiles")} crossed={tiles.subtiles.length} gains={tiles.gains.subtiles} />
          </>
        ) : (
          <p className="text-muted-foreground">{t("gainsPending")}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={switchId} className="flex items-center gap-2 font-normal text-muted-foreground">
            <span className="size-3 shrink-0 rounded-sm bg-[#f472b6] ring-1 ring-[#9d174d] dark:bg-[#9d174d] dark:ring-[#f9a8d4]" aria-hidden />
            {gainedOnly ? t("legendGained") : t("legend")}
          </Label>
          <Switch
            id={switchId}
            size="sm"
            checked={gainedOnly}
            onCheckedChange={onGainedOnlyChange}
            disabled={!tiles?.gains}
            aria-label={t("gainedOnly")}
          />
        </div>
      </section>

      {activity?.stravaId && (
        <p className="text-xs">
          <StravaActivityLink stravaId={activity.stravaId} />
        </p>
      )}
    </div>
  );
}

interface LevelGainsFiguresProps {
  title: string;
  /** Tiles of the level crossed by the activity. */
  crossed: number;
  gains: LevelGains;
}

/** What the activity brought to one level of tiles, with the tiles it crossed. */
function LevelGainsFigures({ title, crossed, gains }: LevelGainsFiguresProps) {
  const t = useTranslations("map.activityPanel");
  const formatter = useFormatter();
  const gain = (value: number) => (value > 0 ? `+${formatter.number(value)}` : formatter.number(value));

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-baseline justify-between gap-3 font-medium">
        {title}
        <span className="text-xs font-normal text-muted-foreground">
          {t("crossed", { count: crossed, formatted: formatter.number(crossed) })}
        </span>
      </p>
      <dl className="grid grid-cols-3 gap-3">
        <PanelFigure label={t("newTiles")} value={gain(gains.gained.length)} />
        <PanelFigure label={t("maxCluster")} value={gain(gains.maxCluster)} />
        <PanelFigure label={t("otherClusters")} value={gain(gains.otherClusters)} />
      </dl>
    </div>
  );
}

"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { Switch } from "@/components/ui/switch";
import { useActivityDetails } from "@/hooks/use-activity";
import { isFootSport, useActivityFormat } from "@/hooks/use-activity-format";
import type { ActivityDetails, ActivityTiles, LevelGains } from "@/lib/api/types";
import { type ActivityView, hasGains } from "./activity-view";
import { PanelFigure, PanelFigures, PanelFiguresSkeleton, PanelSection } from "./panel-figure";
import { StravaActivityLink } from "./strava-activity-link";

interface ActivityPanelProps {
  activityId: string;
  /** Tiles crossed by the activity, drawn on the map; null while loading. */
  tiles: ActivityTiles | null;
  /** Whether the track of the activity is stored in the browser. */
  hasTrack: boolean;
  view: ActivityView;
  onViewChange: (view: ActivityView) => void;
}

/**
 * Content of the panel for an activity: its figures, what it gained when it
 * was recorded, and what the map draws of it.
 */
export function ActivityPanel({ activityId, tiles, hasTrack, view, onViewChange }: ActivityPanelProps) {
  const t = useTranslations("map.activityPanel");
  const formatter = useFormatter();
  const format = useActivityFormat();
  const { activity, error } = useActivityDetails(activityId);
  const gained = tiles !== null && hasGains(tiles);

  if (error) {
    return <p className="text-muted-foreground">{t("error")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        {activity ? (
          <>
            <h2 className="text-lg leading-tight font-semibold wrap-break-word">{activity.name}</h2>
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

      {activity ? <ActivityFigures activity={activity} /> : <PanelFiguresSkeleton count={6} />}

      <PanelSection title={t("gainsTitle")}>
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
      </PanelSection>

      <PanelSection title={t("mapTitle")}>
        <div className="flex flex-col divide-y rounded-lg border">
          <ViewSwitch
            label={tiles?.gains && !gained ? t("nothingGained") : t("gainedOnly")}
            checked={view.gainedOnly && gained}
            disabled={!gained}
            onChange={(gainedOnly) => onViewChange({ ...view, gainedOnly })}
          />
          <ViewSwitch label={t("showTiles")} checked={view.tiles} onChange={(value) => onViewChange({ ...view, tiles: value })} />
          <ViewSwitch
            label={t("showSubtiles")}
            checked={view.subtiles}
            onChange={(subtiles) => onViewChange({ ...view, subtiles })}
          />
          <ViewSwitch
            label={hasTrack ? t("showTrack") : t("noTrack")}
            checked={view.track && hasTrack}
            disabled={!hasTrack}
            onChange={(track) => onViewChange({ ...view, track })}
          />
        </div>
      </PanelSection>

      {activity?.stravaId && (
        <p className="text-xs">
          <StravaActivityLink stravaId={activity.stravaId} />
        </p>
      )}
    </div>
  );
}

/** Distance, durations, speed or pace and elevation of the activity. */
function ActivityFigures({ activity }: { activity: ActivityDetails }) {
  const t = useTranslations("map.activityPanel");
  const format = useActivityFormat();
  const { distanceM, movingTimeS, elapsedTimeS, elevationGainM } = activity;

  return (
    <PanelFigures>
      <PanelFigure label={t("distance")} value={format.distance(distanceM)} />
      <PanelFigure label={t("movingTime")} value={format.duration(movingTimeS)} />
      <PanelFigure label={t("elapsedTime")} value={format.duration(elapsedTimeS)} />
      <PanelFigure label={t("averageSpeed")} value={format.speed(distanceM, movingTimeS)} />
      {isFootSport(activity.sportType) ? (
        <PanelFigure label={t("pace")} value={format.pace(distanceM, movingTimeS)} />
      ) : (
        <PanelFigure label={t("pauses")} value={format.duration(Math.max(0, elapsedTimeS - movingTimeS))} />
      )}
      <PanelFigure label={t("elevation")} value={elevationGainM !== null ? format.elevation(elevationGainM) : "–"} />
    </PanelFigures>
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
    <div className="flex flex-col gap-3 rounded-lg border px-3 py-2.5">
      <p className="flex items-baseline justify-between gap-3 font-medium">
        {title}
        <span className="text-xs font-normal text-muted-foreground">
          {t("crossed", { count: crossed, formatted: formatter.number(crossed) })}
        </span>
      </p>
      <PanelFigures className="grid-cols-4 gap-3">
        <PanelFigure bare label={t("newTiles")} value={gain(gains.gained.length)} />
        <PanelFigure bare label={t("maxSquare")} value={gain(gains.maxSquare)} />
        <PanelFigure bare label={t("maxCluster")} value={gain(gains.maxCluster)} />
        <PanelFigure bare label={t("otherClusters")} value={gain(gains.otherClusters)} />
      </PanelFigures>
    </div>
  );
}

interface ViewSwitchProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ViewSwitch({ label, checked, disabled, onChange }: ViewSwitchProps) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} size="sm" checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

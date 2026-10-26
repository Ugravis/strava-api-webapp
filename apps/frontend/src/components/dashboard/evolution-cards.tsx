"use client";

import { Grid2x2Icon, TrainFrontIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { PILL } from "@/components/distances/theme-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@kilotrace/ui/components/card";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStations } from "@/hooks/use-stations";
import { useTileTimeline } from "@/hooks/use-tile-timeline";
import type { TileTimelineDay, VisitedStations } from "@/lib/api/types";
import { type EvolutionPoint, EvolutionChart, type EvolutionTone } from "./evolution-chart";

/** Counters of the tiles followed over time, each the running sum of a gain of the timeline. */
const TILE_MODES = [
  "tiles",
  "maxClusterTiles",
  "maxSquareTiles",
  "subtiles",
  "maxClusterSubtiles",
  "maxSquareSubtiles",
] as const satisfies readonly (keyof Omit<TileTimelineDay, "date">)[];

type TileMode = (typeof TILE_MODES)[number];

const STATION_MODES = ["stations", "railway"] as const;

type StationMode = (typeof STATION_MODES)[number];

/** Noon of a date `YYYY-MM-DD` in UTC, in milliseconds. */
const timeOf = (date: string) => Date.parse(`${date}T12:00:00Z`);

/** Running sums of a gain of the timeline, a point per day with a gain. */
function tilePoints(timeline: TileTimelineDay[], mode: TileMode): EvolutionPoint[] {
  const points: EvolutionPoint[] = [];
  let value = 0;
  for (const day of timeline) {
    if (day[mode] === 0) continue;
    value += day[mode];
    points.push({ time: timeOf(day.date), value });
  }
  return points;
}

/**
 * Stations visited, or kilometers of railway unlocked, over time: a link is
 * unlocked once both of its stations are visited.
 */
function stationPoints(stations: VisitedStations, mode: StationMode): EvolutionPoint[] {
  const visitedAt = new Map(
    stations.stations.flatMap((station) =>
      station.firstVisitAt ? [[station.id, Date.parse(station.firstVisitAt)] as const] : [],
    ),
  );
  const gains =
    mode === "stations"
      ? [...visitedAt.values()].map((time) => ({ time, amount: 1 }))
      : stations.links.flatMap((link) => {
          const times = link.stations.map((id) => visitedAt.get(id));
          return times.every((time) => time !== undefined)
            ? [{ time: Math.max(...(times as number[])), amount: link.lengthM / 1000 }]
            : [];
        });
  gains.sort((a, b) => a.time - b.time);
  let value = 0;
  return gains.map((gain) => {
    value += gain.amount;
    return { time: gain.time, value };
  });
}

/** Evolution of the counters and achievements of the tiles since the first activity. */
export function TilesEvolution({ version }: { version: string }) {
  const t = useTranslations("dashboard.evolution");
  const format = useFormatter();
  const { timeline, error } = useTileTimeline(version);
  const [mode, setMode] = useState<TileMode>("tiles");
  const points = useMemo(() => (timeline ? tilePoints(timeline, mode) : null), [timeline, mode]);
  const isSquare = mode === "maxSquareTiles" || mode === "maxSquareSubtiles";
  const formatValue = (value: number) =>
    isSquare ? t("squareSize", { size: format.number(value) }) : format.number(Math.round(value));

  return (
    <EvolutionCard
      title={t("tilesTitle")}
      icon={<Grid2x2Icon className="size-4 text-muted-foreground" aria-hidden />}
      modes={TILE_MODES}
      mode={mode}
      onModeChange={setMode}
      modeLabel={(value) => t(`tileModes.${value}`)}
      points={points}
      error={error && !timeline}
      formatValue={formatValue}
      tone="green"
    />
  );
}

/** Evolution of the stations visited and of the railway unlocked since the first activity. */
export function StationsEvolution({ version }: { version: string }) {
  const t = useTranslations("dashboard.evolution");
  const format = useFormatter();
  const { stations, error } = useStations(version);
  const [mode, setMode] = useState<StationMode>("stations");
  const points = useMemo(() => (stations ? stationPoints(stations, mode) : null), [stations, mode]);
  const formatValue = (value: number) =>
    mode === "railway"
      ? format.number(value, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 })
      : format.number(Math.round(value));

  return (
    <EvolutionCard
      title={t("stationsTitle")}
      icon={<TrainFrontIcon className="size-4 text-muted-foreground" aria-hidden />}
      modes={STATION_MODES}
      mode={mode}
      onModeChange={setMode}
      modeLabel={(value) => t(`stationModes.${value}`)}
      points={points}
      error={error}
      formatValue={formatValue}
      tone="violet"
    />
  );
}

interface EvolutionCardProps<Mode extends string> {
  title: string;
  icon: ReactNode;
  modes: readonly Mode[];
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  modeLabel: (mode: Mode) => string;
  /** Null while loading. */
  points: EvolutionPoint[] | null;
  error: boolean;
  formatValue: (value: number) => string;
  tone: EvolutionTone;
}

/** A full-width card: the counter followed, its current value, the pills of the counters and the chart. */
function EvolutionCard<Mode extends string>({
  title,
  icon,
  modes,
  mode,
  onModeChange,
  modeLabel,
  points,
  error,
  formatValue,
  tone,
}: EvolutionCardProps<Mode>) {
  const t = useTranslations("dashboard.evolution");
  const current = points && points.length > 0 ? points[points.length - 1].value : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Tabs value={mode} onValueChange={(next) => onModeChange(next as Mode)}>
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1 py-0.5">
              <TabsList aria-label={t("modesLabel")} className="h-auto gap-2 bg-transparent p-0">
                {modes.map((value) => (
                  <TabsTrigger key={value} value={value} className={PILL}>
                    {modeLabel(value)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          {points && (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatValue(current)}</p>
          )}
        </div>
        {error ? (
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        ) : !points ? (
          <Skeleton className="h-60" />
        ) : points.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <EvolutionChart key={mode} points={points} formatValue={formatValue} label={modeLabel(mode)} tone={tone} />
        )}
      </CardContent>
    </Card>
  );
}

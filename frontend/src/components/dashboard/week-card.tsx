"use client";

import { ArrowDownRightIcon, ArrowUpRightIcon, CalendarRangeIcon, FlameIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFormat } from "@/hooks/use-activity-format";
import type { ActivityDay } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  addDays,
  type DayStreaks,
  dayKey,
  dayStreaks,
  totalsOf,
  weekDays,
  weekdayAverages,
  weekStart,
} from "./calendar";
import { smoothPath } from "./chart-path";

/** Weeks the average of each weekday is computed over. */
const AVERAGE_WEEKS = 52;

/**
 * The current week day by day, over the previous one and the average of each
 * weekday, its distance first, and the run of active days.
 */
export function WeekCard({ days }: { days: ActivityDay[] | null }) {
  const t = useTranslations("dashboard.week");
  const format = useFormatter();
  const activityFormat = useActivityFormat();
  const now = useNow({ updateInterval: 60_000 });
  const today = dayKey(now);

  const week = useMemo(() => {
    if (!days) return null;
    const byDay = new Map(days.map((day) => [day.date, day]));
    const monday = weekStart(now);
    const current = weekDays(monday, byDay);
    const previous = weekDays(addDays(monday, -7), byDay);
    return {
      current,
      previous,
      averages: weekdayAverages(byDay, monday, AVERAGE_WEEKS),
      totals: totalsOf(current),
      previousTotals: totalsOf(previous),
      streaks: dayStreaks(days, now),
    };
  }, [days, now]);

  const change =
    week && week.previousTotals.distanceM > 0 ? week.totals.distanceM / week.previousTotals.distanceM - 1 : null;

  return (
    // The tooltip of the chart may rise above the card.
    <Card className="overflow-visible lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <CalendarRangeIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardAction>
          {week ? <StreakPill streaks={week.streaks} /> : <Skeleton className="h-6 w-28 rounded-full" />}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 items-center">
        <div className="grid w-full items-end gap-6 sm:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">{t("distance")}</dt>
                <dd>
                  {week ? (
                    <span className="text-3xl font-semibold tracking-tight tabular-nums">
                      {activityFormat.distance(week.totals.distanceM)}
                    </span>
                  ) : (
                    <Skeleton className="h-9 w-24" />
                  )}
                </dd>
              </div>
              <div className="flex gap-6">
                {[
                  { key: "time", value: week && activityFormat.duration(week.totals.movingTimeS) },
                  { key: "activities", value: week && format.number(week.totals.count) },
                ].map(({ key, value }) => (
                  <div key={key} className="flex flex-col">
                    <dt className="text-xs text-muted-foreground">{t(key)}</dt>
                    <dd>
                      {value === null ? (
                        <Skeleton className="h-6 w-14" />
                      ) : (
                        <span className="text-lg font-semibold tracking-tight tabular-nums">{value}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {!week ? (
                "\u00a0"
              ) : change === null ? (
                t("noPrevious")
              ) : (
                <span className="inline-flex items-center gap-1">
                  {change >= 0 ? (
                    <ArrowUpRightIcon className="size-3.5 text-green-600 dark:text-green-500" aria-hidden />
                  ) : (
                    <ArrowDownRightIcon className="size-3.5" aria-hidden />
                  )}
                  {t("compared", {
                    change: format.number(change, { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 0 }),
                    previous: activityFormat.distance(week.previousTotals.distanceM),
                  })}
                </span>
              )}
            </p>
          </div>
          {week ? (
            <WeekChart current={week.current} previous={week.previous} averages={week.averages} today={today} />
          ) : (
            <Skeleton className="h-32" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface WeekChartProps {
  current: ActivityDay[];
  previous: ActivityDay[];
  /** Average distance of each weekday, Monday first. */
  averages: number[];
  today: string;
}

/** Distance of each day of the week, in front of the same day of the previous week, under the curve of the averages. */
function WeekChart({ current, previous, averages, today }: WeekChartProps) {
  const t = useTranslations("dashboard.week");
  const format = useFormatter();
  const activityFormat = useActivityFormat();
  const [pointed, setPointed] = useState<number | null>(null);
  const max = Math.max(...current.map((day) => day.distanceM), ...previous.map((day) => day.distanceM), ...averages, 1);
  const share = (meters: number) => (meters / max) * 100;
  const points = averages.map((meters, index): [number, number] => [index * 100 + 50, 100 - share(meters)]);
  const km = (meters: number) =>
    format.number(meters / 1000, { maximumFractionDigits: meters < 10_000 ? 1 : 0 });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" onPointerLeave={() => setPointed(null)}>
        <ol className="grid h-32 grid-cols-7 gap-1 border-b border-dashed pt-5" aria-label={t("daysLabel")}>
          {current.map((day, index) => (
            <li
              key={day.date}
              aria-label={dayDetail(index)}
              onPointerEnter={() => setPointed(index)}
              className="relative flex items-end justify-center"
            >
              {previous[index].distanceM > 0 && (
                <div
                  className="absolute bottom-0 w-4 rounded-t-md bg-foreground/8 sm:w-5"
                  style={{ height: `${share(previous[index].distanceM)}%` }}
                />
              )}
              {day.distanceM > 0 && (
                <>
                  <div
                    className="relative w-2 rounded-t-full bg-green-600 transition-[height] duration-700 ease-out sm:w-2.5 dark:bg-green-500"
                    style={{ height: `${share(day.distanceM)}%` }}
                  />
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground tabular-nums"
                    style={{ bottom: `calc(${share(day.distanceM)}% + 2px)` }}
                  >
                    {km(day.distanceM)}
                  </span>
                </>
              )}
              {pointed === index && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 flex-col gap-0.5 rounded-lg bg-popover px-2.5 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10"
                  // Above the taller of its bars and its label.
                  style={{ bottom: `calc(${share(Math.max(day.distanceM, previous[index].distanceM))}% + 16px)` }}
                >
                  <span className="font-medium first-letter:uppercase">
                    {format.dateTime(new Date(`${day.date}T12:00:00`), { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                  <TooltipRow swatch="h-2.5 w-1.5 rounded-full bg-green-600 dark:bg-green-500" label={t("legendCurrent")}>
                    {activityFormat.distance(day.distanceM)}
                  </TooltipRow>
                  <TooltipRow swatch="h-2.5 w-3 rounded-sm bg-foreground/15" label={t("legendPrevious")}>
                    {activityFormat.distance(previous[index].distanceM)}
                  </TooltipRow>
                  <TooltipRow
                    swatch="w-3 border-t-[1.5px] border-dashed border-violet-700 dark:border-violet-400"
                    label={t("average")}
                  >
                    {activityFormat.distance(averages[index])}
                  </TooltipRow>
                </div>
              )}
            </li>
          ))}
        </ol>
        <svg
          aria-hidden
          viewBox="0 0 700 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-5 bottom-0 h-[calc(100%-1.25rem)] w-full overflow-visible text-violet-700 dark:text-violet-400"
        >
          <path
            d={smoothPath(points)}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <ol className="grid grid-cols-7 gap-1" aria-hidden>
        {current.map((day) => (
          <li
            key={day.date}
            className={cn(
              "text-center text-[11px] text-muted-foreground uppercase",
              day.date === today && "font-semibold text-foreground",
              day.date > today && "opacity-50",
            )}
          >
            {format.dateTime(new Date(`${day.date}T12:00:00`), { weekday: "narrow" })}
          </li>
        ))}
      </ol>
      <ul className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-1.5 rounded-full bg-green-600 dark:bg-green-500" />
          {t("legendCurrent")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-foreground/10" />
          {t("legendPrevious")}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-3 border-t-[1.5px] border-dashed border-violet-700 dark:border-violet-400" />
          {t("legendAverage", { weeks: AVERAGE_WEEKS })}
        </li>
      </ul>
    </div>
  );

  function dayDetail(index: number): string {
    return t("dayDetail", {
      current: activityFormat.distance(current[index].distanceM),
      previous: activityFormat.distance(previous[index].distanceM),
      average: activityFormat.distance(averages[index]),
    });
  }
}

/** A line of the tooltip of the chart: the mark of a series, its name and its value. */
function TooltipRow({ swatch, label, children }: { swatch: string; label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className={swatch} />
      {label}
      <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{children}</span>
    </span>
  );
}

/** The run of active days, with its record of the year in its tooltip. */
function StreakPill({ streaks }: { streaks: DayStreaks }) {
  const t = useTranslations("dashboard.week");

  return (
    <span
      title={t("bestStreak", { count: streaks.best })}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums",
        streaks.current > 0
          ? "bg-violet-700/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
          : "bg-muted text-muted-foreground",
      )}
    >
      <FlameIcon className="size-3.5" aria-hidden />
      {t("streak", { count: streaks.current })}
    </span>
  );
}

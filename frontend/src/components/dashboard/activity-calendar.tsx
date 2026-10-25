"use client";

import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFormat } from "@/hooks/use-activity-format";
import { useYearDays } from "@/hooks/use-year-days";
import type { ActivityDay } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { addDays, dateOf, dayKey, dayLevel, levelThresholds, totalsOf, weekStart } from "./calendar";

/** Colors of the levels of a day, the green of the tiles of the map for the busiest ones. */
const LEVEL_CLASS = [
  "bg-muted",
  "bg-green-200 dark:bg-green-950",
  "bg-green-400 dark:bg-green-800",
  "bg-green-600 dark:bg-green-600",
  "bg-green-800 dark:bg-green-400",
] as const;

/** Months of the previous year the calendar of the current year shows at least, early in the year. */
const MARGIN_MONTHS = 2;

interface CalendarCell {
  date: Date;
  key: string;
  day: ActivityDay | undefined;
  /** Outside of the period shown, in the weeks at its ends. */
  outside: boolean;
  future: boolean;
}

interface ActivityCalendarProps {
  /** Start of the first activity, the earliest year shown; null without activities. */
  firstActivityAt: string | null;
  /** Refreshes the days, e.g. while a synchronization imports activities. */
  version: string;
  className?: string;
}

/**
 * A calendar year day by day, from two months before at least for the current
 * one, colored by distance compared to the usual days of the user, with the
 * details of the day pointed at and arrows to the other years.
 */
export function ActivityCalendar({ firstActivityAt, version, className }: ActivityCalendarProps) {
  const t = useTranslations("dashboard.calendar");
  const format = useFormatter();
  const activityFormat = useActivityFormat();
  const now = useNow({ updateInterval: 60_000 });
  const [pointed, setPointed] = useState<CalendarCell | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const today = dayKey(now);
  const currentYear = now.getFullYear();
  const firstYear = firstActivityAt ? new Date(firstActivityAt).getFullYear() : currentYear;
  const [requestedYear, setYear] = useState(currentYear);
  const { loaded } = useYearDays(requestedYear, version);
  // The year shown stays until the next one is loaded, so that the card keeps its shape.
  const year = loaded?.year ?? requestedYear;
  const days = loaded?.days ?? null;
  const pending = loaded !== null && loaded.year !== requestedYear;

  const { weeks, totals, activeDays, thresholds } = useMemo(() => {
    const byDay = new Map((days ?? []).map((day) => [day.date, day]));
    const end = `${year}-12-31`;
    let start = `${year}-01-01`;
    if (year === currentYear) {
      const margin = dateOf(today);
      margin.setMonth(margin.getMonth() - MARGIN_MONTHS);
      if (dayKey(margin) < start) start = dayKey(margin);
    }
    const first = weekStart(dateOf(start));
    const count = Math.round((weekStart(dateOf(end)).getTime() - first.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
    const columns = Array.from({ length: count }, (_, week) =>
      Array.from({ length: 7 }, (_, weekday): CalendarCell => {
        const date = addDays(first, week * 7 + weekday);
        const key = dayKey(date);
        return { date, key, day: byDay.get(key), outside: key < start || key > end, future: key > today };
      }),
    );
    const shown = (days ?? []).filter((day) => day.date >= start && day.date <= end);
    return { weeks: columns, totals: totalsOf(shown), activeDays: shown.length, thresholds: levelThresholds(shown) };
    // Keyed by `today`: the minute ticks of `now` do not rebuild the grid.
  }, [days, year, currentYear, today]);

  // On a narrow screen, the current year shows its latest weeks first.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = year === currentYear ? element.scrollWidth : 0;
  }, [days, year, currentYear]);

  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: meters < 10_000 ? 1 : 0 });
  /** Distances of a level of the legend, from the quartiles of the user. */
  const levelLabel = (level: number) => {
    if (level === 0) return t("rest");
    if (!Number.isFinite(thresholds[0])) return undefined;
    if (level === 1) return t("below", { distance: km(thresholds[0]) });
    if (level === 4) return t("above", { distance: km(thresholds[2]) });
    return t("between", { from: km(thresholds[level - 2]), to: km(thresholds[level - 1]) });
  };

  const months = weeks.map((week, index) => {
    const month = week[0].date.getMonth();
    const starts = index === 0 ? week[0].date.getDate() <= 7 : weeks[index - 1][0].date.getMonth() !== month;
    return starts ? format.dateTime(week[0].date, { month: "short" }) : null;
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <CalendarDaysIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title", { year: requestedYear })}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("previousYear")}
            disabled={requestedYear <= firstYear}
            onClick={() => setYear(requestedYear - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("nextYear")}
            disabled={requestedYear >= currentYear}
            onClick={() => setYear(requestedYear + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </CardAction>
        <CardDescription>
          {days === null ? (
            <Skeleton className="h-4 w-64 max-w-full" />
          ) : (
            t("summary", {
              activities: totals.count,
              days: activeDays,
              distance: activityFormat.distance(totals.distanceM),
              time: activityFormat.duration(totals.movingTimeS),
            })
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-3 transition-opacity", pending && "opacity-50")}>
        <div ref={scroller} className="-mx-1 overflow-x-auto px-1 pb-1">
          <div
            role="img"
            aria-label={t("label", { days: activeDays })}
            // One column per week, filling the width of the card, scrolled on a narrow screen.
            className="grid min-w-xl gap-[3px]"
            style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
            onPointerLeave={(event) => event.pointerType === "mouse" && setPointed(null)}
          >
            <span />
            {months.map((month, index) => (
              <span
                key={index}
                className="overflow-visible pb-1 text-[10px] leading-none whitespace-nowrap text-muted-foreground capitalize"
              >
                {month}
              </span>
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
              <Fragment key={weekday}>
                <span className="self-center pr-1.5 text-[10px] leading-none text-muted-foreground capitalize">
                  {weekday % 2 === 0 ? format.dateTime(weeks[0][weekday].date, { weekday: "short" }) : ""}
                </span>
                {weeks.map((week) => {
                  const cell = week[weekday];
                  return (
                    <span
                      key={cell.key}
                      onPointerEnter={() => setPointed(cell.future || cell.outside ? null : cell)}
                      className={cn(
                        "aspect-square w-full rounded-[3px]",
                        days === null
                          ? "animate-pulse bg-muted"
                          : cell.future
                            ? "bg-muted/40"
                            : LEVEL_CLASS[dayLevel(cell.day, thresholds)],
                        cell.outside && "invisible",
                        cell.key === today && "ring-1 ring-foreground/60 ring-offset-1 ring-offset-card",
                        pointed?.key === cell.key && "ring-2 ring-foreground ring-offset-1 ring-offset-card",
                      )}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <p className="min-h-4 tabular-nums" aria-live="off">
            {pointed ? (
              <>
                <span className="inline-block font-medium text-foreground first-letter:uppercase">
                  {format.dateTime(pointed.date, { weekday: "long", day: "numeric", month: "long" })}
                </span>
                {" · "}
                {pointed.day
                  ? t("day", {
                      count: pointed.day.count,
                      distance: activityFormat.distance(pointed.day.distanceM),
                      time: activityFormat.duration(pointed.day.movingTimeS),
                    })
                  : t("rest")}
              </>
            ) : (
              t("hint")
            )}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden>
            {t("less")}
            {LEVEL_CLASS.map((className, level) => (
              <span key={level} title={levelLabel(level)} className={cn("size-3 rounded-[3px]", className)} />
            ))}
            {t("more")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { BarChart3Icon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { useMonthlyDistances } from "@/hooks/use-monthly-distances";
import { usePointed } from "@kilotrace/ui/hooks/use-pointed";
import type { MonthDistance, MonthlyFamily } from "@kilotrace/ui/lib/api/types";
import { cn } from "@kilotrace/ui/lib/utils";
import { monotonePath } from "./chart-path";
import { niceStep } from "@kilotrace/ui/components/dashboard/evolution-chart";

const FAMILIES: readonly MonthlyFamily[] = ["ride", "run", "hike", "swim", "other"];

/** Green of the most practiced family, akin to the bars of the week chart. */
const LEADING_CLASS = "bg-green-500";
/** Colors of the next families by rank, away from the green and the violet of the curves. */
const RANK_CLASSES = ["bg-blue-500", "bg-orange-500", "bg-amber-500", "bg-rose-500"];
/** The other sports stay grey unless they lead. */
const OTHER_CLASS = "bg-foreground/15";

/** Color of each family, by its distance over the period: the most practiced one in green. */
function familyColors(ranked: MonthlyFamily[]): Record<MonthlyFamily, string> {
  const colors = Object.fromEntries(FAMILIES.map((family) => [family, OTHER_CLASS])) as Record<MonthlyFamily, string>;
  let rank = 0;
  ranked.forEach((family, index) => {
    if (index === 0) colors[family] = LEADING_CLASS;
    else if (family !== "other") colors[family] = RANK_CLASSES[rank++ % RANK_CLASSES.length];
  });
  return colors;
}

/** Past years drawn as dashed curves, the closest one the most marked. */
const HISTORY_YEARS = [1, 2] as const;
const HISTORY_CLASS: Record<(typeof HISTORY_YEARS)[number], { curve: string; dot: string; swatch: string }> = {
  1: {
    curve: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-700 dark:bg-violet-400",
    swatch: "border-violet-700 dark:border-violet-400",
  },
  2: {
    curve: "text-violet-700/35 dark:text-violet-400/40",
    dot: "bg-violet-300 dark:bg-violet-400/50",
    swatch: "border-violet-700/35 dark:border-violet-400/40",
  },
};

const EMPTY_FAMILIES: Record<MonthlyFamily, number> = { ride: 0, run: 0, hike: 0, swim: 0, other: 0 };

/** Months shown by the rolling view: the current one and the twelve before. */
const ROLLING_MONTHS = 13;

/** `YYYY-MM` of a month counted from January of year 0. */
const monthKey = (index: number) => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;

/**
 * Distance of each month, from the current one back a year, or of a past
 * calendar year with the arrows: each family of sports stacked in the bar of
 * its month, the same months of the three years before as curves.
 */
export function MonthlyDistance({ version }: { version: string }) {
  const t = useTranslations("dashboard.monthly");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { months, error } = useMonthlyDistances(version);
  const currentYear = now.getFullYear();
  const firstYear = months && months.length > 0 ? Number(months[0].month.slice(0, 4)) : currentYear;
  // A past calendar year, or null for the months up to the current one.
  const [year, setYear] = useState<number | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<MonthlyFamily>>(new Set());

  const { yearMonths, history } = useMemo(() => {
    const byMonth = new Map((months ?? []).map((month) => [month.month, month]));
    const monthAt = (index: number): MonthDistance =>
      byMonth.get(monthKey(index)) ?? { month: monthKey(index), distanceM: 0, families: EMPTY_FAMILIES };
    const first = year === null ? currentYear * 12 + now.getMonth() - (ROLLING_MONTHS - 1) : year * 12;
    const count = year === null ? ROLLING_MONTHS : 12;
    return {
      yearMonths: Array.from({ length: count }, (_, index) => monthAt(first + index)),
      history: HISTORY_YEARS.map((years) =>
        Array.from({ length: count }, (_, index) => monthAt(first + index - 12 * years)),
      ),
    };
  }, [months, year, currentYear, now]);
  // Families practiced during the year, those hidden from the legend apart.
  const practiced = FAMILIES.filter((family) => yearMonths.some((month) => month.families[family] > 0));
  const distanceOf = (family: MonthlyFamily) => yearMonths.reduce((sum, month) => sum + month.families[family], 0);
  const colors = familyColors(practiced.toSorted((a, b) => distanceOf(b) - distanceOf(a)));
  const total = yearMonths.reduce((sum, month) => sum + month.distanceM, 0);

  return (
    // The tooltip of the chart may rise above the card.
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <BarChart3Icon className="size-4 text-muted-foreground" aria-hidden />
          {year === null ? t("rollingTitle") : t("title", { year })}
        </CardTitle>
        <CardDescription>
          {months ? (
            t("summary", { distance: format.number(total / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }) })
          ) : (
            <Skeleton className="h-4 w-40" />
          )}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("previousYear")}
            disabled={(year ?? currentYear) <= firstYear}
            onClick={() => setYear((year ?? currentYear) - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("nextYear")}
            disabled={year === null}
            onClick={() => setYear(year !== null && year + 1 < currentYear ? year + 1 : null)}
          >
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex min-h-8 flex-wrap gap-2" aria-label={t("legend")}>
          {practiced.map((family) => (
            <li key={family}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                aria-pressed={!hidden.has(family)}
                onClick={() =>
                  setHidden((current) => {
                    const next = new Set(current);
                    if (next.has(family)) next.delete(family);
                    else next.add(family);
                    return next;
                  })
                }
              >
                <span
                  className={cn("h-2.5 w-1.5 rounded-full", colors[family], hidden.has(family) && "opacity-30")}
                  aria-hidden
                />
                <span className={cn(hidden.has(family) && "text-muted-foreground line-through")}>
                  {t(`families.${family}`)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
        {error && !months ? (
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        ) : !months ? (
          <Skeleton className="h-64" />
        ) : (
          <MonthlyChart
            months={yearMonths}
            history={history}
            families={practiced.filter((family) => !hidden.has(family))}
            colors={colors}
          />
        )}
      </CardContent>
    </Card>
  );
}

/** Dates `YYYY-MM` as the first day of the month, at noon. */
const dateOfMonth = (month: string) => new Date(`${month}-01T12:00:00`);

interface MonthlyChartProps {
  months: MonthDistance[];
  /** The same months one and two years earlier. */
  history: MonthDistance[][];
  families: MonthlyFamily[];
  colors: Record<MonthlyFamily, string>;
}

/** The families of each month stacked in its bar, under the dashed curves of the years before. */
function MonthlyChart({ months, history, families, colors }: MonthlyChartProps) {
  const t = useTranslations("dashboard.monthly");
  const format = useFormatter();
  const chart = useRef<HTMLDivElement>(null);
  const { pointed, point, leave } = usePointed<number>(chart);

  // Only the shown families count, the past years included: like is compared with like.
  const shown = (month: MonthDistance) => families.reduce((sum, family) => sum + month.families[family], 0);
  const max = Math.max(...months.map(shown), ...history.flat().map(shown), 1);
  const step = niceStep(max / 1000) * 1000;
  const high = Math.ceil(max / step) * step;
  const share = (meters: number) => (meters / high) * 100;
  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 });
  const short = (meters: number) => format.number(meters / 1000, { maximumFractionDigits: 0 });
  const spansYears = months[0].month.slice(0, 4) !== months[months.length - 1].month.slice(0, 4);
  const columns = { gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` };

  return (
    <div className="flex flex-col gap-2">
      <div ref={chart} className="relative ml-12" onPointerLeave={leave}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-5 bottom-0">
          {Array.from({ length: Math.round(high / step) + 1 }, (_, index) => index * step).map((value) => (
            <div
              key={value}
              className={cn("absolute inset-x-0 border-t", value === 0 ? "border-border" : "border-dashed border-border/70")}
              style={{ bottom: `${share(value)}%` }}
            >
              <span className="absolute right-full -translate-y-1/2 pr-2 text-[10px] whitespace-nowrap text-muted-foreground tabular-nums">
                {km(value)}
              </span>
            </div>
          ))}
        </div>
        <ol className="relative grid h-56 gap-1 pt-5" style={columns} aria-label={t("label")}>
          {months.map((month, index) => {
            const total = shown(month);
            const stacked = families.filter((family) => month.families[family] > 0);
            return (
              <li
                key={month.month}
                aria-label={`${format.dateTime(dateOfMonth(month.month), { month: "long", year: "numeric" })} : ${km(total)}`}
                onPointerEnter={(event) => point(event, index)}
                onPointerDown={(event) => point(event, index)}
                className="relative flex items-end justify-center"
              >
                {pointed === index && <div className="absolute inset-x-0 -top-5 bottom-0 rounded-md bg-foreground/4" />}
                {total > 0 && (
                  <>
                    <div
                      className="relative flex w-4 flex-col-reverse gap-px overflow-hidden sm:w-7 lg:w-9 transition-[height] duration-700 ease-out"
                      style={{ height: `${share(total)}%` }}
                    >
                      {stacked.map((family) => (
                        <div
                          key={family}
                          className={cn("min-h-px", colors[family])}
                          style={{ height: `${(month.families[family] / total) * 100}%` }}
                        />
                      ))}
                    </div>
                    <span
                      className="absolute left-1/2 hidden -translate-x-1/2 text-[9px] text-muted-foreground tabular-nums sm:block"
                      style={{ bottom: `calc(${share(total)}% + 2px)` }}
                    >
                      {short(total)}
                    </span>
                  </>
                )}
                {pointed === index &&
                  HISTORY_YEARS.map((years) => (
                    <span
                      key={years}
                      className={cn(
                        "pointer-events-none absolute left-1/2 z-[1] size-2 -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-card",
                        HISTORY_CLASS[years].dot,
                      )}
                      style={{ bottom: `${share(shown(history[years - 1][index]))}%` }}
                    />
                  ))}
                {pointed === index && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute left-1/2 z-10 flex min-w-40 -translate-x-1/2 flex-col gap-0.5 rounded-lg bg-popover px-2.5 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10"
                    // Above the taller of its bar, its label and its curves.
                    style={{
                      bottom: `calc(${share(Math.max(total, ...history.map((year) => shown(year[index]))))}% + 16px)`,
                    }}
                  >
                    <span className="font-medium first-letter:uppercase">
                      {format.dateTime(dateOfMonth(month.month), { month: "long", year: "numeric" })}
                    </span>
                    {stacked
                      .toSorted((a, b) => month.families[b] - month.families[a])
                      .map((family) => (
                        <TooltipRow
                          key={family}
                          swatch={cn("h-2.5 w-1.5 rounded-full", colors[family])}
                          label={t(`families.${family}`)}
                        >
                          {km(month.families[family])}
                        </TooltipRow>
                      ))}
                    {stacked.length > 1 && (
                      <TooltipRow swatch="w-1.5" label={t("total")}>
                        {km(total)}
                      </TooltipRow>
                    )}
                    <span className="my-1 h-px bg-border" />
                    {HISTORY_YEARS.map((years) => (
                      <TooltipRow
                        key={years}
                        swatch={cn("w-3 border-t-[1.5px] border-dashed", HISTORY_CLASS[years].swatch)}
                        label={t("yearsEarlier", { count: years })}
                      >
                        {km(shown(history[years - 1][index]))}
                      </TooltipRow>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <svg
          aria-hidden
          viewBox={`0 0 ${months.length * 100} 100`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 top-5 bottom-0 h-[calc(100%-1.25rem)] w-full overflow-visible"
        >
          {[...HISTORY_YEARS].reverse().map((years) => (
            <path
              key={years}
              d={monotonePath(
                history[years - 1].map((month, index): [number, number] => [index * 100 + 50, 100 - share(shown(month))]),
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              className={HISTORY_CLASS[years].curve}
            />
          ))}
        </svg>
      </div>
      <ol className="ml-12 grid gap-1" style={columns} aria-hidden>
        {months.map((month, index) => (
          <li
            key={month.month}
            className={cn(
              "truncate text-center text-[11px] text-muted-foreground capitalize",
              pointed === index && "font-semibold text-foreground",
            )}
          >
            {format.dateTime(
              dateOfMonth(month.month),
              // The year where it changes, when the months span two.
              spansYears && (index === 0 || month.month.endsWith("-01")) ? { month: "short", year: "2-digit" } : { month: "short" },
            )}
          </li>
        ))}
      </ol>
      <ul className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {HISTORY_YEARS.map((years) => (
          <li key={years} className="flex items-center gap-1.5">
            <span className={cn("w-3 border-t-[1.5px] border-dashed", HISTORY_CLASS[years].swatch)} />
            {t("yearsEarlier", { count: years })}
          </li>
        ))}
      </ul>
    </div>
  );
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

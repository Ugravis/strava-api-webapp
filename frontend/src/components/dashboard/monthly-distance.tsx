"use client";

import { BarChart3Icon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyDistances } from "@/hooks/use-monthly-distances";
import type { MonthDistance, MonthlyFamily } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { monotonePath } from "./chart-path";
import { niceStep } from "./evolution-chart";

const FAMILIES: readonly MonthlyFamily[] = ["ride", "run", "hike", "swim", "other"];

/** Color of the curve of each family: categorical hues in a fixed order, the other sports in grey. */
const FAMILY_CLASS: Record<MonthlyFamily, { stroke: string; swatch: string }> = {
  ride: { stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]", swatch: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  run: { stroke: "stroke-[#eb6834] dark:stroke-[#d95926]", swatch: "bg-[#eb6834] dark:bg-[#d95926]" },
  hike: { stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]", swatch: "bg-[#1baf7a] dark:bg-[#199e70]" },
  swim: { stroke: "stroke-[#eda100] dark:stroke-[#c98500]", swatch: "bg-[#eda100] dark:bg-[#c98500]" },
  other: { stroke: "stroke-muted-foreground", swatch: "bg-muted-foreground" },
};

const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 24, left: 56 };

const EMPTY_FAMILIES: Record<MonthlyFamily, number> = { ride: 0, run: 0, hike: 0, swim: 0, other: 0 };

/**
 * Distance of each month of a calendar year, with arrows to the other years:
 * the total as the main curve, each family of sports as a thinner one.
 */
export function MonthlyDistance({ version }: { version: string }) {
  const t = useTranslations("dashboard.monthly");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const { months, error } = useMonthlyDistances(version);
  const currentYear = now.getFullYear();
  const firstYear = months && months.length > 0 ? Number(months[0].month.slice(0, 4)) : currentYear;
  const [year, setYear] = useState(currentYear);
  const [hidden, setHidden] = useState<ReadonlySet<MonthlyFamily>>(new Set());

  // The twelve months of the year, those to come left out.
  const yearMonths = useMemo(() => {
    const byMonth = new Map((months ?? []).map((month) => [month.month, month]));
    const last = year === currentYear ? now.getMonth() : 11;
    return Array.from({ length: last + 1 }, (_, index): MonthDistance => {
      const key = `${year}-${String(index + 1).padStart(2, "0")}`;
      return byMonth.get(key) ?? { month: key, distanceM: 0, families: EMPTY_FAMILIES };
    });
  }, [months, year, currentYear, now]);
  // Families practiced during the year, those hidden from the legend apart.
  const practiced = FAMILIES.filter((family) => yearMonths.some((month) => month.families[family] > 0));
  const total = yearMonths.reduce((sum, month) => sum + month.distanceM, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <BarChart3Icon className="size-4 text-muted-foreground" aria-hidden />
          {t("title", { year })}
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
            disabled={year <= firstYear}
            onClick={() => setYear(year - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("nextYear")}
            disabled={year >= currentYear}
            onClick={() => setYear(year + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ul className="flex min-h-8 flex-wrap gap-2" aria-label={t("legend")}>
          <li className="flex h-8 items-center gap-1.5 px-1 text-sm font-medium">
            <span className="h-[3px] w-3.5 rounded-full bg-foreground" aria-hidden />
            {t("total")}
          </li>
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
                  className={cn("h-0.5 w-3 rounded-full", FAMILY_CLASS[family].swatch, hidden.has(family) && "opacity-30")}
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
          <Skeleton style={{ height: HEIGHT }} />
        ) : (
          <MonthlyChart
            months={yearMonths}
            families={practiced.filter((family) => !hidden.has(family))}
          />
        )}
      </CardContent>
    </Card>
  );
}

/** Dates `YYYY-MM` as the first day of the month, at noon. */
const dateOfMonth = (month: string) => new Date(`${month}-01T12:00:00`);

/** The curves of the months of a year, twelve slots wide; pointed at, the figures of a month. */
function MonthlyChart({ months, families }: { months: MonthDistance[]; families: MonthlyFamily[] }) {
  const t = useTranslations("dashboard.monthly");
  const format = useFormatter();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pointed, setPointed] = useState<number | null>(null);

  // Measured before the first paint, so that the chart never shows empty.
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const slot = plotWidth / 12;
  const maxKm = Math.max(...months.map((month) => month.distanceM), 1) / 1000;
  const step = niceStep(maxKm);
  const high = Math.ceil(maxKm / step) * step;

  const x = (index: number) => MARGIN.left + (index + 0.5) * slot;
  const y = (meters: number) => MARGIN.top + (1 - meters / 1000 / high) * plotHeight;
  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 });
  const curve = (value: (month: MonthDistance) => number) =>
    monotonePath(months.map((month, index): [number, number] => [x(index), y(value(month))]));
  const totalCurve = curve((month) => month.distanceM);
  const pointedMonth = pointed === null ? null : months[pointed];

  return (
    <div className="relative w-full select-none">
      <div ref={container} style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            role="img"
            aria-label={t("label")}
            width={width}
            height={HEIGHT}
            className="block"
            onPointerMove={(event) => {
              const left = event.currentTarget.getBoundingClientRect().left;
              const index = Math.floor((event.clientX - left - MARGIN.left) / slot);
              setPointed(index >= 0 && index < months.length ? index : null);
            }}
            onPointerLeave={() => setPointed(null)}
          >
            {Array.from({ length: Math.round(high / step) + 1 }, (_, index) => index * step).map((value) => (
              <g key={value}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotWidth}
                  y1={y(value * 1000)}
                  y2={y(value * 1000)}
                  className="stroke-border"
                  strokeDasharray={value === 0 ? undefined : "2 3"}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(value * 1000)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {km(value * 1000)}
                </text>
              </g>
            ))}
            {Array.from({ length: 12 }, (_, index) => (
              <text
                key={index}
                x={x(index)}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] capitalize"
              >
                {format.dateTime(new Date(2000, index, 1), { month: "short" })}
              </text>
            ))}
            {pointed !== null && (
              <rect
                x={MARGIN.left + pointed * slot}
                y={MARGIN.top}
                width={slot}
                height={plotHeight}
                className="fill-foreground/5"
              />
            )}
            {months.length > 1 && (
              <path
                d={`${totalCurve} L ${x(months.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
                className="fill-foreground/5"
              />
            )}
            {families.map((family) => (
              <path
                key={family}
                d={curve((month) => month.families[family])}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                className={FAMILY_CLASS[family].stroke}
              />
            ))}
            <path d={totalCurve} fill="none" strokeWidth={3} strokeLinecap="round" className="stroke-foreground" />
            {months.map((month, index) => (
              <circle
                key={month.month}
                cx={x(index)}
                cy={y(month.distanceM)}
                r={pointed === index ? 5 : 3}
                strokeWidth={2}
                className="fill-foreground stroke-card"
              />
            ))}
          </svg>
        )}
      </div>
      {pointedMonth && pointed !== null && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute top-2 z-10 flex min-w-44 flex-col gap-0.5 rounded-lg bg-popover px-2.5 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10",
            // Beside its month, on the side with more room.
            x(pointed) > width / 2 ? "-translate-x-[calc(100%+16px)]" : "translate-x-4",
          )}
          style={{ left: x(pointed) }}
        >
          <span className="font-medium first-letter:uppercase">
            {format.dateTime(dateOfMonth(pointedMonth.month), { month: "long", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-[3px] w-3 rounded-full bg-foreground" />
            {t("total")}
            <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{km(pointedMonth.distanceM)}</span>
          </span>
          {families
            .filter((family) => pointedMonth.families[family] > 0)
            .sort((a, b) => pointedMonth.families[b] - pointedMonth.families[a])
            .map((family) => (
              <span key={family} className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("h-0.5 w-3 rounded-full", FAMILY_CLASS[family].swatch)} />
                {t(`families.${family}`)}
                <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
                  {km(pointedMonth.families[family])}
                </span>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

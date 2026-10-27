"use client";

import { useFormatter } from "next-intl";
import { type PointerEvent, useId, useLayoutEffect, useRef, useState } from "react";
import { monotonePath } from "@/components/dashboard/chart-path";
import { niceStep } from "@/components/dashboard/evolution-chart";
import { usePointed } from "@/hooks/use-pointed";
import { cn } from "@/lib/utils";
import { SERIES_COLORS, type SeriesColorName } from "./palette";

export interface ChartSeries {
  id: string;
  label: string;
  color: SeriesColorName;
}

export interface ChartPoint {
  /** `YYYY-MM-DD` of a UTC day, or the ISO 8601 start of a quarter of an hour. */
  start: string;
  values: Record<string, number | null>;
}

/** Figures shown in the tooltip only, one value per point. */
export interface ChartNote {
  label: string;
  values: (number | null)[];
}

interface TimeSeriesChartProps {
  /** A filled curve of a single series, or bars stacking every series. */
  kind: "area" | "bars";
  points: ChartPoint[];
  series: ChartSeries[];
  unit: "day" | "quarter";
  label: string;
  /** Row of the tooltip summing the series, for stacked bars. */
  totalLabel?: string;
  /** A ceiling drawn as a dashed step line, such as a quota. */
  limit?: ChartNote;
  notes?: ChartNote[];
  height?: number;
}

const MARGIN = { top: 12, right: 8, bottom: 24, left: 36 };
/** Room taken by a label of the time axis. */
const TICK_WIDTH = 64;

const timeOf = (point: ChartPoint, unit: TimeSeriesChartProps["unit"]) =>
  new Date(unit === "day" ? `${point.start}T00:00:00Z` : point.start);

/** A bar whose top corners, its data end, are rounded. */
function barPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + width - r} Q ${x + width} ${y} ${x + width} ${y + r} V ${y + height} Z`;
}

/**
 * Values over time, a slot per day or quarter of an hour; pointed at, the
 * figures of a slot. Labels come from the server, as the admin messages.
 */
export function TimeSeriesChart({
  kind,
  points,
  series,
  unit,
  label,
  totalLabel,
  limit,
  notes = [],
  height = 220,
}: TimeSeriesChartProps) {
  const format = useFormatter();
  // Usable in `url(#…)`.
  const gradientId = `gradient-${useId().replace(/[^\w-]/g, "")}`;
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const { pointed, point, leave } = usePointed<number>(chart);

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
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const slot = plotWidth / Math.max(points.length, 1);
  const totals = points.map((entry) => series.reduce((sum, item) => sum + (entry.values[item.id] ?? 0), 0));
  const highest = Math.max(...totals, ...(limit?.values ?? []).map((value) => value ?? 0), 1);
  const step = niceStep(highest);
  const top = Math.ceil(highest / step) * step;

  const x = (index: number) => MARGIN.left + (index + 0.5) * slot;
  const y = (value: number) => MARGIN.top + (1 - value / top) * plotHeight;
  const count = (value: number) => format.number(value, { notation: value >= 10_000 ? "compact" : "standard" });
  const formatTime = (date: Date, long = false) =>
    unit === "day"
      ? format.dateTime(date, { timeZone: "UTC", day: "numeric", month: long ? "long" : "short", ...(long && { weekday: "long" }) })
      : format.dateTime(date, { hour: "2-digit", minute: "2-digit" });

  // Labels spread over the axis, the latest slot always named; quarters on full hours only.
  const candidates = points
    .map((entry, index) => ({ index, date: timeOf(entry, unit) }))
    .filter(({ date }) => unit === "day" || date.getMinutes() === 0);
  const every = Math.max(1, Math.ceil((candidates.length * TICK_WIDTH) / plotWidth));
  const ticks = candidates.filter((_, index) => (candidates.length - 1 - index) % every === 0);

  const pointSlot = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const index = Math.floor((event.clientX - left - MARGIN.left) / slot);
    point(event, index >= 0 && index < points.length ? index : null);
  };

  const area = series[0];
  const curve =
    kind === "area" && area
      ? monotonePath(points.map((entry, index): [number, number] => [x(index), y(entry.values[area.id] ?? 0)]))
      : "";
  const limitPath = limit
    ? points
        .map((_, index) => {
          const value = limit.values[index];
          if (value === null) return "";
          const left = MARGIN.left + index * slot;
          return `M ${left} ${y(value)} H ${left + slot}`;
        })
        .join(" ")
    : "";
  const barWidth = Math.max(slot - Math.min(slot * 0.35, 8), 1);
  const pointedEntry = pointed === null ? null : points[pointed];

  return (
    <div ref={chart} className="relative w-full select-none">
      <div ref={container} style={{ height }}>
        {width > 0 && (
          <svg
            role="img"
            aria-label={label}
            width={width}
            height={height}
            className="block touch-pan-y"
            onPointerDown={pointSlot}
            onPointerMove={pointSlot}
            onPointerLeave={leave}
          >
            {area && (
              <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1" className={SERIES_COLORS[area.color].text}>
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
            )}
            {Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step).map((value) => (
              <g key={value}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotWidth}
                  y1={y(value)}
                  y2={y(value)}
                  className="stroke-border"
                  strokeDasharray={value === 0 ? undefined : "2 4"}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {count(value)}
                </text>
              </g>
            ))}
            {ticks.map(({ index, date }) => (
              <text
                key={index}
                x={x(index)}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatTime(date)}
              </text>
            ))}
            {pointed !== null && (
              <rect
                x={MARGIN.left + pointed * slot}
                y={MARGIN.top}
                width={slot}
                height={plotHeight}
                rx={Math.min(4, slot / 4)}
                className="fill-foreground/5"
              />
            )}
            {kind === "area" && area && points.length > 1 && (
              <>
                <path
                  d={`${curve} L ${x(points.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
                  fill={`url(#${gradientId})`}
                />
                <path
                  d={curve}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className={SERIES_COLORS[area.color].stroke}
                />
                {pointed !== null && (
                  <>
                    <line
                      x1={x(pointed)}
                      x2={x(pointed)}
                      y1={MARGIN.top}
                      y2={MARGIN.top + plotHeight}
                      className="stroke-foreground/30"
                    />
                    <circle
                      cx={x(pointed)}
                      cy={y(points[pointed].values[area.id] ?? 0)}
                      r={5}
                      strokeWidth={2}
                      className={cn(SERIES_COLORS[area.color].fill, "stroke-card")}
                    />
                  </>
                )}
              </>
            )}
            {kind === "bars" &&
              points.map((entry, index) => {
                const left = x(index) - barWidth / 2;
                let base = 0;
                const stacked = series
                  .map((item) => ({ item, value: entry.values[item.id] ?? 0 }))
                  .filter(({ value }) => value > 0);
                return (
                  <g key={entry.start} className={cn(pointed !== null && pointed !== index && "opacity-60")}>
                    {stacked.map(({ item, value }, position) => {
                      const bottom = y(base);
                      base += value;
                      // A gap of the surface between two segments.
                      const gap = position > 0 ? Math.min(2, (bottom - y(base)) / 2) : 0;
                      const segmentTop = y(base);
                      const segmentHeight = Math.max(bottom - segmentTop - gap, 0.5);
                      return position === stacked.length - 1 ? (
                        <path
                          key={item.id}
                          d={barPath(left, segmentTop, barWidth, segmentHeight, 4)}
                          className={SERIES_COLORS[item.color].fill}
                        />
                      ) : (
                        <rect
                          key={item.id}
                          x={left}
                          y={segmentTop}
                          width={barWidth}
                          height={segmentHeight}
                          className={SERIES_COLORS[item.color].fill}
                        />
                      );
                    })}
                  </g>
                );
              })}
            {limitPath && (
              <path d={limitPath} fill="none" strokeWidth={1.5} strokeDasharray="4 3" className="stroke-foreground/70" />
            )}
          </svg>
        )}
      </div>
      {pointedEntry && pointed !== null && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute top-2 z-10 flex min-w-44 flex-col gap-0.5 rounded-lg bg-popover px-2.5 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10",
            // Beside its slot, on the side with more room.
            x(pointed) > width / 2 ? "-translate-x-[calc(100%+16px)]" : "translate-x-4",
          )}
          style={{ left: x(pointed) }}
        >
          <span className="font-medium first-letter:uppercase">{formatTime(timeOf(pointedEntry, unit), true)}</span>
          {totalLabel && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {totalLabel}
              <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{count(totals[pointed])}</span>
            </span>
          )}
          {series.map((item) => (
            <span key={item.id} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-xs", SERIES_COLORS[item.color].swatch)} />
              {item.label}
              <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
                {pointedEntry.values[item.id] === null ? "–" : count(pointedEntry.values[item.id] ?? 0)}
              </span>
            </span>
          ))}
          {[...(limit ? [limit] : []), ...notes].map((note) => (
            <span key={note.label} className="flex items-center gap-1.5 text-muted-foreground">
              {note.label}
              <span className="ml-auto pl-3 tabular-nums">
                {note.values[pointed] === null ? "–" : count(note.values[pointed] ?? 0)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

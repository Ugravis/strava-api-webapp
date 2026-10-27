"use client";

import { useFormatter } from "next-intl";
import { type PointerEvent, useLayoutEffect, useRef, useState } from "react";
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
  points: ChartPoint[];
  series: ChartSeries[];
  unit: "day" | "quarter";
  label: string;
  /** Row of the tooltip summing the series, for stacked bars. */
  totalLabel?: string;
  /**
   * A ceiling drawn as a dashed step line, such as a quota; left out of the
   * scale, then named above the chart, when far above the values.
   */
  limit?: ChartNote;
  /** Names the limit when it does not fit the scale. */
  limitCaption?: string;
  notes?: ChartNote[];
  height?: number;
}

const MARGIN = { top: 12, right: 8, bottom: 24, left: 36 };
/** Room taken by a label of the time axis. */
const TICK_WIDTH = 64;
/** A total this many times the next highest gets its bar cut, not the scale. */
const OUTLIER_RATIO = 3;
/** A limit this many times the highest value is left out of the scale. */
const LIMIT_RATIO = 2;

const timeOf = (point: ChartPoint, unit: TimeSeriesChartProps["unit"]) =>
  new Date(unit === "day" ? `${point.start}T00:00:00Z` : point.start);

/** A bar whose top corners, its data end, are rounded. */
function barPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + width - r} Q ${x + width} ${y} ${x + width} ${y + r} V ${y + height} Z`;
}

/**
 * Bars stacking every series, a slot per day or quarter of an hour; pointed
 * at, the figures of a slot. Labels come from the server, as the admin
 * messages.
 */
export function TimeSeriesChart({
  points,
  series,
  unit,
  label,
  totalLabel,
  limit,
  limitCaption,
  notes = [],
  height = 220,
}: TimeSeriesChartProps) {
  const format = useFormatter();
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
  // A single huge day, such as the first import of a long history, would flatten all the others.
  const [first = 0, second = 0] = [...totals].sort((a, b) => b - a);
  const ceiling = second > 0 && first > second * OUTLIER_RATIO ? second : first;
  const limitHighest = Math.max(0, ...(limit?.values ?? []).map((value) => value ?? 0));
  const limitShown = limit !== undefined && limitHighest > 0 && limitHighest <= Math.max(ceiling, 1) * LIMIT_RATIO;
  const highest = Math.max(ceiling, limitShown ? limitHighest : 0, 1);
  const step = niceStep(highest);
  const top = Math.ceil(highest / step) * step;

  const x = (index: number) => MARGIN.left + (index + 0.5) * slot;
  const y = (value: number) => MARGIN.top + (1 - Math.min(value, top) / top) * plotHeight;
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

  const limitPath = limitShown
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
      {limit && !limitShown && limitHighest > 0 && limitCaption && (
        <p className="mb-2 text-xs text-muted-foreground">{limitCaption}</p>
      )}
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
            {points.map((entry, index) => {
              const left = x(index) - barWidth / 2;
              let base = 0;
              // A cut bar keeps the shares of its series within the plot.
              const scale = totals[index] > top ? top / totals[index] : 1;
              const stacked = series
                .map((item) => ({ item, value: (entry.values[item.id] ?? 0) * scale }))
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
                  {totals[index] > top && (
                    // Cut below its top, its total written above.
                    <>
                      <path
                        d={`M ${left - 1} ${MARGIN.top + 14} L ${left + barWidth + 1} ${MARGIN.top + 9}`}
                        strokeWidth={3}
                        className="stroke-card"
                      />
                      <text
                        x={x(index)}
                        y={MARGIN.top - 4}
                        textAnchor="middle"
                        className="fill-foreground text-[10px] font-medium tabular-nums"
                      >
                        {count(totals[index])}
                      </text>
                    </>
                  )}
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
              <span className="ml-auto pl-3 font-semibold text-foreground tabular-nums">{format.number(totals[pointed])}</span>
            </span>
          )}
          {series.map((item) => (
            <span key={item.id} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-xs", SERIES_COLORS[item.color].swatch)} />
              {item.label}
              <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">
                {pointedEntry.values[item.id] === null ? "–" : format.number(pointedEntry.values[item.id] ?? 0)}
              </span>
            </span>
          ))}
          {[...(limit ? [limit] : []), ...notes].map((note) => (
            <span key={note.label} className="flex items-center gap-1.5 text-muted-foreground">
              {note.label}
              <span className="ml-auto pl-3 tabular-nums">
                {note.values[pointed] === null ? "–" : format.number(note.values[pointed] ?? 0)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

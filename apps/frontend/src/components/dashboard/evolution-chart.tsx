"use client";

import { RotateCcwIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type PointerEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { cn } from "@/lib/utils";

/** The value of a counter from a date on, until the next point. */
export interface EvolutionPoint {
  /** Milliseconds since the epoch. */
  time: number;
  value: number;
}

export type EvolutionTone = "green" | "violet";

interface EvolutionChartProps {
  /** Values of a counter that only grows, oldest first; zero before the first one. */
  points: EvolutionPoint[];
  formatValue: (value: number) => string;
  /** Name of the counter, for the screen readers. */
  label: string;
  tone: EvolutionTone;
}

const HEIGHT = 240;
const MARGIN = { top: 12, right: 12, bottom: 24, left: 48 };
const DAY_MS = 24 * 3600 * 1000;
/** Narrowest selection that zooms, in pixels, below which a press is a mere click. */
const MIN_SELECTION_PX = 6;

const TONE_CLASS: Record<EvolutionTone, { line: string; area: string; dot: string; selection: string }> = {
  green: {
    line: "stroke-green-600 dark:stroke-green-500",
    area: "fill-green-600/10 dark:fill-green-500/15",
    dot: "fill-green-600 dark:fill-green-500",
    selection: "fill-green-600/10 stroke-green-600/40",
  },
  violet: {
    line: "stroke-violet-700 dark:stroke-violet-400",
    area: "fill-violet-700/10 dark:fill-violet-400/15",
    dot: "fill-violet-700 dark:fill-violet-400",
    selection: "fill-violet-700/10 stroke-violet-700/40",
  },
};

/** The value of the counter at `time`: that of the latest point before it. */
function valueAt(points: EvolutionPoint[], time: number): number {
  let low = 0;
  let high = points.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (points[middle].time <= time) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found === -1 ? 0 : points[found].value;
}

/** A round step of about a quarter of `span`. */
export function niceStep(span: number): number {
  const raw = Math.max(span, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

/** Dates of the ticks of the time axis: years, months or days depending on the span. */
function timeTicks(start: number, end: number): { time: number; unit: "year" | "month" | "day" }[] {
  const span = end - start;
  const ticks: { time: number; unit: "year" | "month" | "day" }[] = [];
  if (span > 3 * 365 * DAY_MS) {
    for (let year = new Date(start).getFullYear() + 1; year <= new Date(end).getFullYear(); year += 1) {
      ticks.push({ time: new Date(year, 0, 1).getTime(), unit: "year" });
    }
    return ticks;
  }
  if (span > 60 * DAY_MS) {
    const months = span / (30 * DAY_MS);
    const every = months > 24 ? 6 : months > 12 ? 3 : months > 6 ? 2 : 1;
    const date = new Date(start);
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    for (; date.getTime() <= end; date.setMonth(date.getMonth() + 1)) {
      if (date.getMonth() % every === 0) ticks.push({ time: date.getTime(), unit: "month" });
    }
    return ticks;
  }
  const every = Math.max(1, Math.round(span / DAY_MS / 6));
  for (let time = start + every * DAY_MS; time <= end; time += every * DAY_MS) {
    ticks.push({ time, unit: "day" });
  }
  return ticks;
}

/**
 * The evolution of a counter as a step line, from its first value to now:
 * pointed at, the value of the day; a selection dragged across zooms on it.
 * Keyed by its series, it shows a new one whole.
 */
export function EvolutionChart({ points, formatValue, label, tone }: EvolutionChartProps) {
  const t = useTranslations("dashboard.evolution");
  const format = useFormatter();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [pointer, setPointer] = useState<number | null>(null);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [now] = useState(() => Date.now());

  // Measured before the first paint, so that a new chart never shows empty.
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const full: [number, number] = [points.length > 0 ? points[0].time - DAY_MS : now - 30 * DAY_MS, now];
  const [start, end] = zoom ?? full;
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { low, high, step } = useMemo(() => {
    const from = zoom ? valueAt(points, start) : 0;
    const to = Math.max(valueAt(points, end), from + 1);
    const tick = niceStep(to - from);
    return { low: Math.floor(from / tick) * tick, high: Math.ceil(to / tick) * tick, step: tick };
  }, [points, zoom, start, end]);

  const x = (time: number) => MARGIN.left + ((time - start) / (end - start)) * plotWidth;
  const y = (value: number) => MARGIN.top + (1 - (value - low) / (high - low)) * plotHeight;
  const timeAt = (px: number) => start + ((px - MARGIN.left) / plotWidth) * (end - start);

  let steps = `M ${x(start)} ${y(valueAt(points, start))}`;
  for (const point of points) {
    if (point.time > start && point.time <= end) steps += ` H ${x(point.time)} V ${y(point.value)}`;
  }
  const path = { line: `${steps} H ${x(end)}`, area: `${steps} H ${x(end)} V ${y(low)} H ${x(start)} Z` };

  const localX = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.min(Math.max(event.clientX - rect.left, MARGIN.left), MARGIN.left + plotWidth);
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const px = localX(event);
    setSelection([px, px]);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const px = localX(event);
    setPointer(px);
    if (selection) setSelection([selection[0], px]);
  };
  const onPointerUp = () => {
    if (selection && Math.abs(selection[1] - selection[0]) >= MIN_SELECTION_PX) {
      const from = timeAt(Math.min(...selection));
      const to = timeAt(Math.max(...selection));
      // At least two days, so that a step stays readable.
      setZoom(to - from < 2 * DAY_MS ? [from - DAY_MS, from + DAY_MS] : [from, to]);
    }
    setSelection(null);
  };

  const pointedTime = pointer === null ? null : timeAt(pointer);
  const pointedValue = pointedTime === null ? 0 : valueAt(points, pointedTime);
  const ticks = timeTicks(start, end);
  const tickLabel = (tick: { time: number; unit: string }) =>
    tick.unit === "year"
      ? format.dateTime(tick.time, { year: "numeric" })
      : tick.unit === "month"
        ? format.dateTime(tick.time, { month: "short", year: "2-digit" })
        : format.dateTime(tick.time, { day: "numeric", month: "short" });
  const classes = TONE_CLASS[tone];

  return (
    <div className="relative w-full select-none">
      <div ref={container} style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            role="img"
            aria-label={t("label", { name: label, value: formatValue(valueAt(points, end)) })}
            width={width}
            height={HEIGHT}
            className="block cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={() => setPointer(null)}
          >
            {Array.from({ length: Math.round((high - low) / step) + 1 }, (_, index) => low + index * step).map((value) => (
              <g key={value}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + plotWidth}
                  y1={y(value)}
                  y2={y(value)}
                  className="stroke-border"
                  strokeDasharray={value === low ? undefined : "2 3"}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {formatValue(value)}
                </text>
              </g>
            ))}
            {ticks.map((tick) => (
              <text
                key={tick.time}
                x={x(tick.time)}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] capitalize"
              >
                {tickLabel(tick)}
              </text>
            ))}
            <path d={path.area} className={classes.area} />
            <path d={path.line} fill="none" strokeWidth={2} strokeLinejoin="round" className={classes.line} />
            {selection && (
              <rect
                x={Math.min(...selection)}
                y={MARGIN.top}
                width={Math.abs(selection[1] - selection[0])}
                height={plotHeight}
                className={classes.selection}
                strokeDasharray="3 3"
              />
            )}
            {pointer !== null && !selection && (
              <>
                <line
                  x1={pointer}
                  x2={pointer}
                  y1={MARGIN.top}
                  y2={MARGIN.top + plotHeight}
                  className="stroke-foreground/30"
                />
                <circle
                  cx={pointer}
                  cy={y(pointedValue)}
                  r={4}
                  className={cn(classes.dot, "stroke-card")}
                  strokeWidth={2}
                />
              </>
            )}
          </svg>
        )}
      </div>
      {pointer !== null && pointedTime !== null && !selection && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute top-2 z-10 flex flex-col rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10",
            // Kept inside the chart, on the side with more room.
            pointer > width / 2 ? "-translate-x-[calc(100%+10px)]" : "translate-x-2.5",
          )}
          style={{ left: pointer }}
        >
          <span className="text-muted-foreground">{format.dateTime(pointedTime, { dateStyle: "medium" })}</span>
          <span className="font-semibold tabular-nums">{formatValue(pointedValue)}</span>
        </div>
      )}
      <div className="flex h-7 items-center justify-between gap-2 pl-12 text-[11px] text-muted-foreground">
        <span>{t("hint")}</span>
        {zoom && (
          <Button variant="outline" size="xs" onClick={() => setZoom(null)}>
            <RotateCcwIcon />
            {t("reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

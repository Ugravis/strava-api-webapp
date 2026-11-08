"use client";

import { useFormatter } from "next-intl";
import { type PointerEvent, useRef } from "react";
import { niceStep } from "@/components/dashboard/evolution-chart";
import type { ChartSeries } from "@/components/admin/statistics/time-series-chart";
import { usePointed } from "@/hooks/use-pointed";
import { cn } from "@/lib/utils";
import { SERIES_COLORS } from "@/components/admin/statistics/palette";
import { useChartWidth } from "./use-chart-width";

/** Figures shown in the tooltip only, already formatted, one per bar. */
export interface BarNote {
  label: string;
  values: string[];
}

interface BarChartProps {
  /** Short labels of the axis, one per bar. */
  labels: string[];
  /** Titles of the tooltip, one per bar; the labels by default. */
  titles?: string[];
  series: ChartSeries[];
  /** Per series id, one value per bar, stacked in the order of the series. */
  values: Record<string, number[]>;
  label: string;
  /** Row of the tooltip summing the series, for stacked bars. */
  totalLabel?: string;
  /** Share of each bar in the total of the chart, in the tooltip, as `shareLabel`. */
  shareLabel?: string;
  notes?: BarNote[];
  height?: number;
  /** A logarithmic axis, by powers of ten, for values far apart. */
  log?: boolean;
}

const MARGIN = { top: 12, right: 8, bottom: 24, left: 36 };
/** Room taken by a label of the axis. */
const TICK_WIDTH = 44;
/** Widest bar, so that a few bars stay bars. */
const BAR_MAX = 48;

/** A bar whose top corners, its data end, are rounded. */
function barPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + width - r} Q ${x + width} ${y} ${x + width} ${y + r} V ${y + height} Z`;
}

/**
 * Bars over categories (buckets, weeks, months, whole numbers), every series
 * stacked; pointed at, the figures of a bar. Labels come from the server.
 */
export function BarChart({ labels, titles = labels, series, values, label, totalLabel, shareLabel, notes = [], height = 200, log = false }: BarChartProps) {
  const format = useFormatter();
  const chart = useRef<HTMLDivElement>(null);
  const { container, width } = useChartWidth();
  const { pointed, point, leave } = usePointed<number>(chart);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const slot = plotWidth / Math.max(labels.length, 1);
  const totals = labels.map((_, index) => series.reduce((sum, item) => sum + (values[item.id]?.[index] ?? 0), 0));
  const sum = totals.reduce((total, value) => total + value, 0);
  const highest = Math.max(...totals, 1);
  const step = Math.max(niceStep(highest), 1);
  // On a logarithmic axis, the next power of ten; one more than the value, so that zero stays at the bottom.
  const top = log ? 10 ** Math.max(Math.ceil(Math.log10(highest)), 1) : Math.max(Math.ceil(highest / step) * step, step);
  const ticks = log
    ? // From ten: the line of one would crowd the bottom.
      [0, ...Array.from({ length: Math.round(Math.log10(top)) }, (_, power) => 10 ** (power + 1))]
    : Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const x = (index: number) => MARGIN.left + (index + 0.5) * slot;
  const y = (value: number) => MARGIN.top + (1 - (log ? Math.log10(1 + value) / Math.log10(1 + top) : value / top)) * plotHeight;
  const count = (value: number) => format.number(value, { notation: value >= 10_000 ? "compact" : "standard" });
  const every = Math.max(1, Math.ceil((labels.length * TICK_WIDTH) / plotWidth));
  const barWidth = Math.min(Math.max(slot - Math.min(slot * 0.3, 10), 1), BAR_MAX);

  const pointSlot = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const index = Math.floor((event.clientX - left - MARGIN.left) / slot);
    point(event, index >= 0 && index < labels.length ? index : null);
  };

  return (
    <div ref={chart} className="relative w-full select-none">
      <div ref={container} style={{ height }}>
        {width > 0 && (
          <svg role="img" aria-label={label} width={width} height={height} className="block touch-pan-y" onPointerDown={pointSlot} onPointerMove={pointSlot} onPointerLeave={leave}>
            {ticks.map((value) => (
              <g key={value}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(value)} y2={y(value)} className="stroke-border" strokeDasharray={value === 0 ? undefined : "2 4"} />
                <text x={MARGIN.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {count(value)}
                </text>
              </g>
            ))}
            {labels.map((text, index) =>
              (labels.length - 1 - index) % every === 0 ? (
                <text key={index} x={x(index)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                  {text}
                </text>
              ) : null,
            )}
            {pointed !== null && <rect x={MARGIN.left + pointed * slot} y={MARGIN.top} width={slot} height={plotHeight} rx={Math.min(4, slot / 4)} className="fill-foreground/5" />}
            {labels.map((text, index) => {
              let base = 0;
              const stacked = series.map((item) => ({ item, value: values[item.id]?.[index] ?? 0 })).filter(({ value }) => value > 0);
              return (
                <g key={`${text}-${index}`} className={cn(pointed !== null && pointed !== index && "opacity-60")}>
                  {stacked.map(({ item, value }, position) => {
                    const bottom = y(base);
                    base += value;
                    // A gap of the surface between two segments.
                    const gap = position > 0 ? Math.min(2, (bottom - y(base)) / 2) : 0;
                    const segmentHeight = Math.max(bottom - y(base) - gap, 0.5);
                    const left = x(index) - barWidth / 2;
                    return position === stacked.length - 1 ? (
                      <path key={item.id} d={barPath(left, y(base), barWidth, segmentHeight, 4)} className={SERIES_COLORS[item.color].fill} />
                    ) : (
                      <rect key={item.id} x={left} y={y(base)} width={barWidth} height={segmentHeight} className={SERIES_COLORS[item.color].fill} />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {pointed !== null && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute top-2 z-10 flex min-w-40 flex-col gap-0.5 rounded-lg bg-popover px-2.5 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10",
            x(pointed) > width / 2 ? "-translate-x-[calc(100%+16px)]" : "translate-x-4",
          )}
          style={{ left: x(pointed) }}
        >
          <span className="font-medium first-letter:uppercase">{titles[pointed]}</span>
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
              <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{format.number(values[item.id]?.[pointed] ?? 0)}</span>
            </span>
          ))}
          {shareLabel && sum > 0 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {shareLabel}
              <span className="ml-auto pl-3 tabular-nums">{format.number(totals[pointed] / sum, { style: "percent", maximumFractionDigits: 1 })}</span>
            </span>
          )}
          {notes.map((note) => (
            <span key={note.label} className="flex items-center gap-1.5 text-muted-foreground">
              {note.label}
              <span className="ml-auto pl-3 tabular-nums">{note.values[pointed]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

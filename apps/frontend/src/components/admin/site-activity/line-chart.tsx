"use client";

import { useFormatter } from "next-intl";
import { type PointerEvent, useRef } from "react";
import { niceStep } from "@/components/dashboard/evolution-chart";
import { SERIES_COLORS } from "@/components/admin/statistics/palette";
import type { ChartSeries } from "@/components/admin/statistics/time-series-chart";
import { usePointed } from "@/hooks/use-pointed";
import { cn } from "@/lib/utils";
import { useChartWidth } from "./use-chart-width";

interface LineChartProps {
  /** Short labels of the axis, one per point. */
  labels: string[];
  /** Titles of the tooltip, one per point; the labels by default. */
  titles?: string[];
  series: ChartSeries[];
  /** Per series id, one value per point; null for none yet. */
  values: Record<string, (number | null)[]>;
  label: string;
  /** Values as ratios, the scale from 0 % to 100 % at most. */
  percent?: boolean;
  height?: number;
}

const MARGIN = { top: 12, right: 12, bottom: 24, left: 40 };
const TICK_WIDTH = 56;

/** One line per series over the same scale; pointed at, a crosshair and the figures of the point. */
export function LineChart({ labels, titles = labels, series, values, label, percent = false, height = 220 }: LineChartProps) {
  const format = useFormatter();
  const chart = useRef<HTMLDivElement>(null);
  const { container, width } = useChartWidth();
  const { pointed, point, leave } = usePointed<number>(chart);

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const highest = Math.max(...series.flatMap((item) => (values[item.id] ?? []).map((value) => value ?? 0)), percent ? 0.2 : 1);
  const step = percent ? niceStep(highest * 100) / 100 : Math.max(niceStep(highest), 1);
  const top = percent ? Math.min(Math.ceil(highest / step) * step, 1) : Math.ceil(highest / step) * step;
  const x = (index: number) => MARGIN.left + (labels.length > 1 ? (index / (labels.length - 1)) * plotWidth : plotWidth / 2);
  const y = (value: number) => MARGIN.top + (1 - value / top) * plotHeight;
  const tick = (value: number) =>
    percent ? format.number(value, { style: "percent", maximumFractionDigits: 0 }) : format.number(value, { notation: value >= 10_000 ? "compact" : "standard" });
  const figure = (value: number | null | undefined) =>
    value == null ? "–" : percent ? format.number(value, { style: "percent", maximumFractionDigits: 1 }) : format.number(value, { maximumFractionDigits: 1 });
  const every = Math.max(1, Math.ceil((labels.length * TICK_WIDTH) / plotWidth));

  const pointAt = (event: PointerEvent<SVGSVGElement>) => {
    const left = event.currentTarget.getBoundingClientRect().left;
    const ratio = (event.clientX - left - MARGIN.left) / plotWidth;
    const index = Math.round(ratio * (labels.length - 1));
    point(event, index >= 0 && index < labels.length ? index : null);
  };

  /** Segments of a series, broken where a value is missing. */
  const path = (points: (number | null)[]) =>
    points.reduce<{ d: string; open: boolean }>(
      (acc, value, index) => (value === null ? { d: acc.d, open: false } : { d: `${acc.d} ${acc.open ? "L" : "M"} ${x(index)} ${y(Math.min(value, top))}`, open: true }),
      { d: "", open: false },
    ).d;

  return (
    <div ref={chart} className="relative w-full select-none">
      <div ref={container} style={{ height }}>
        {width > 0 && (
          <svg role="img" aria-label={label} width={width} height={height} className="block touch-pan-y" onPointerDown={pointAt} onPointerMove={pointAt} onPointerLeave={leave}>
            {Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step).map((value) => (
              <g key={value}>
                <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y(value)} y2={y(value)} className="stroke-border" strokeDasharray={value === 0 ? undefined : "2 4"} />
                <text x={MARGIN.left - 8} y={y(value)} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-[10px] tabular-nums">
                  {tick(value)}
                </text>
              </g>
            ))}
            {labels.map((text, index) =>
              (labels.length - 1 - index) % every === 0 ? (
                <text key={index} x={x(index)} y={height - 6} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[10px]">
                  {text}
                </text>
              ) : null,
            )}
            {pointed !== null && <line x1={x(pointed)} x2={x(pointed)} y1={MARGIN.top} y2={MARGIN.top + plotHeight} className="stroke-foreground/25" />}
            {series.map((item) => (
              <path
                key={item.id}
                d={path(values[item.id] ?? [])}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={SERIES_COLORS[item.color].stroke}
              />
            ))}
            {/* A value without a neighbour draws no segment: a dot shows it. */}
            {series.map((item) =>
              (values[item.id] ?? []).map((value, index, list) =>
                value !== null && (list[index - 1] ?? null) === null && (list[index + 1] ?? null) === null ? (
                  <circle key={`${item.id}-${index}`} cx={x(index)} cy={y(Math.min(value, top))} r={2.5} className={SERIES_COLORS[item.color].fill} />
                ) : null,
              ),
            )}
            {pointed !== null &&
              series.map((item) => {
                const value = values[item.id]?.[pointed];
                return value == null ? null : (
                  <circle key={item.id} cx={x(pointed)} cy={y(Math.min(value, top))} r={4} strokeWidth={2} className={cn("stroke-card", SERIES_COLORS[item.color].fill)} />
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
          {series.map((item) => (
            <span key={item.id} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn("size-2 rounded-xs", SERIES_COLORS[item.color].swatch)} />
              {item.label}
              <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{figure(values[item.id]?.[pointed])}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

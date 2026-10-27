"use client";

import { useFormatter } from "next-intl";
import { useRef } from "react";
import { usePointed } from "@/hooks/use-pointed";
import { cn } from "@/lib/utils";
import { SERIES_COLORS, type SeriesColorName } from "./palette";

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: SeriesColorName;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** What the total in the middle counts. */
  totalLabel: string;
  label: string;
  emptyLabel: string;
}

const SIZE = 152;
const THICKNESS = 18;
const RADIUS = (SIZE - THICKNESS) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface left between two segments, along the ring. */
const GAP = 3;

/**
 * Parts of a whole as a ring, the total in its middle, beside a legend with
 * the figures; pointing at a segment or its row brings it forward.
 */
export function DonutChart({ segments, totalLabel, label, emptyLabel }: DonutChartProps) {
  const format = useFormatter();
  const area = useRef<HTMLDivElement>(null);
  const { pointed, point, leave } = usePointed<string>(area);
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const shown = segments.filter((segment) => segment.value > 0);
  const gap = shown.length > 1 ? GAP : 0;
  const share = (value: number) => format.number(total > 0 ? value / total : 0, { style: "percent", maximumFractionDigits: 1 });
  const focused = segments.find((segment) => segment.id === pointed) ?? null;

  const lengthOf = (segment: DonutSegment) => (segment.value / total) * CIRCUMFERENCE;
  const arcs = shown.map((segment, index) => ({
    segment,
    length: Math.max(lengthOf(segment) - gap, 0.5),
    offset: shown.slice(0, index).reduce((sum, before) => sum + lengthOf(before), 0),
  }));

  return (
    <div ref={area} className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg role="img" aria-label={label} width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={THICKNESS} className="stroke-muted" />
          {arcs.map(({ segment, length, offset: start }) => (
            <circle
              key={segment.id}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={pointed === segment.id ? THICKNESS + 4 : THICKNESS}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-start}
              className={cn(
                SERIES_COLORS[segment.color].stroke,
                "cursor-default transition-[stroke-width,opacity] duration-150",
                pointed !== null && pointed !== segment.id && "opacity-40",
              )}
              onPointerEnter={(event) => point(event, segment.id)}
              onPointerDown={(event) => point(event, segment.id)}
              onPointerLeave={leave}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {format.number(focused ? focused.value : total)}
          </span>
          <span className="max-w-24 text-[11px] leading-tight text-muted-foreground">
            {focused ? share(focused.value) : totalLabel}
          </span>
        </div>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="flex w-full flex-col gap-1">
          {segments.map((segment) => (
            <li
              key={segment.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                pointed === segment.id && "bg-muted",
              )}
              onPointerEnter={(event) => point(event, segment.id)}
              onPointerDown={(event) => point(event, segment.id)}
              onPointerLeave={leave}
            >
              <span className={cn("size-2.5 shrink-0 rounded-full", SERIES_COLORS[segment.color].swatch)} aria-hidden />
              <span className="text-muted-foreground">{segment.label}</span>
              <span className="ml-auto font-medium tabular-nums">{format.number(segment.value)}</span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{share(segment.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

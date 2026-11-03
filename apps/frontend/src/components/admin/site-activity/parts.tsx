import type { ReactNode } from "react";
import { SERIES_COLORS, type SeriesColorName } from "@/components/admin/statistics/palette";
import { cn } from "@/lib/utils";

/** The thin scrollbar of the tables and of the split panel. */
export const THIN_SCROLL =
  "overflow-y-auto overscroll-contain [scrollbar-color:color-mix(in_oklab,var(--color-muted-foreground)_35%,transparent)_transparent] [scrollbar-width:thin]";

export interface BarListItem {
  key: string;
  label: ReactNode;
  value: number;
  /** The figure written on the right. */
  figure: ReactNode;
  /** A second line, under the label. */
  detail?: ReactNode;
}

interface BarListProps {
  items: BarListItem[];
  /** Bars against this value; the highest of the list by default. */
  max?: number;
  color?: SeriesColorName;
  /** Labels as routes, in a monospaced font. */
  mono?: boolean;
  empty: string;
  /** Scrolls past this height, in pixels. */
  maxHeight?: number;
}

/** A ranking: each row its label, its figure and a bar of its value. */
export function BarList({ items, max, color = "blue", mono = false, empty, maxHeight }: BarListProps) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const scale = max ?? Math.max(...items.map((item) => item.value), 1);
  return (
    <ol className={cn("-mx-2 flex flex-col gap-2.5 px-2", maxHeight && THIN_SCROLL)} style={maxHeight ? { maxHeight } : undefined}>
      {items.map((item) => (
        <li key={item.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={cn("min-w-0 truncate", mono && "font-mono text-xs")}>{item.label}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{item.figure}</span>
          </div>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className={cn("block h-full rounded-full", SERIES_COLORS[color].swatch)} style={{ width: `${Math.min(item.value / scale, 1) * 100}%` }} />
          </span>
          {item.detail && <span className="text-xs text-muted-foreground">{item.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

/** A figure summing a card, above its chart. */
export function CardFigure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Figures, then the legend, above a chart. */
export function ChartHead({ figures, legend }: { figures?: ReactNode; legend?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {figures && <div className="flex flex-wrap gap-x-6 gap-y-2">{figures}</div>}
      {legend}
    </div>
  );
}

/**
 * A cell shaded by a ratio, in a single hue: retention and conversion grids.
 * Text keeps its ink whatever the shade.
 */
export function RateCell({ ratio, children, title, className }: { ratio: number | null; children: ReactNode; title?: string; className?: string }) {
  return (
    <td className={cn("p-0.5", className)} title={title}>
      <span
        className={cn(
          "relative flex h-8 min-w-12 items-center justify-center overflow-hidden rounded-md text-xs tabular-nums",
          ratio === null ? "text-muted-foreground" : "bg-muted/60 font-medium",
        )}
      >
        {ratio !== null && (
          <span className="absolute inset-0 bg-[#2a78d6] dark:bg-[#3987e5]" style={{ opacity: 0.08 + Math.min(ratio, 1) * 0.62 }} aria-hidden />
        )}
        <span className={cn("relative", ratio !== null && ratio > 0.55 && "text-white")}>{children}</span>
      </span>
    </td>
  );
}

import { SERIES_COLORS, type SeriesColorName } from "@/components/admin/statistics/palette";
import { cn } from "@/lib/utils";

/**
 * Plain charts of the temporary site activity page, drawn on the server:
 * there only to check the data, a real dashboard replaces them.
 */

export interface PlainSeries {
  id: string;
  label: string;
  color: SeriesColorName;
}

const WIDTH = 600;
const HEIGHT = 160;

/** One line per series over evenly spaced labels, the scale from zero. */
export function PlainLineChart({
  labels,
  series,
  values,
  format = String,
}: {
  labels: string[];
  series: PlainSeries[];
  /** Per series id, one value per label. */
  values: Record<string, number[]>;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...series.flatMap((entry) => values[entry.id]));
  const x = (index: number) => (labels.length > 1 ? (index / (labels.length - 1)) * WIDTH : WIDTH / 2);
  const y = (value: number) => HEIGHT - (value / max) * HEIGHT;

  return (
    <div className="flex flex-col gap-2">
      <PlainLegend series={series} />
      <div className="flex gap-2 text-xs text-muted-foreground">
        <div className="flex flex-col justify-between">
          <span>{format(max)}</span>
          <span>{format(0)}</span>
        </div>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible border-b border-l">
          {series.map((entry) => (
            <polyline
              key={entry.id}
              fill="none"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              className={SERIES_COLORS[entry.color].stroke}
              points={values[entry.id].map((value, index) => `${x(index)},${y(value)}`).join(" ")}
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

/** Vertical bars, one per label, its value above. */
export function PlainBarChart({
  bars,
  color = "blue",
  format = String,
}: {
  bars: { label: string; value: number }[];
  color?: SeriesColorName;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div className="flex h-44 items-end gap-1">
      {bars.map((bar) => (
        <div key={bar.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>{format(bar.value)}</span>
          <div className={cn("w-full rounded-t-sm", SERIES_COLORS[color].swatch)} style={{ height: `${(bar.value / max) * 75}%` }} />
          <span className="truncate">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal bars, for labels too long to stand under a bar. */
export function PlainBarList({
  bars,
  color = "blue",
  format = String,
}: {
  bars: { label: string; value: number }[];
  color?: SeriesColorName;
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {bars.map((bar) => (
        <div key={bar.label} className="grid grid-cols-[minmax(0,18rem)_1fr_auto] items-center gap-2">
          <span className="truncate text-muted-foreground">{bar.label}</span>
          <div className="h-3 rounded-sm bg-muted">
            <div className={cn("h-full rounded-sm", SERIES_COLORS[color].swatch)} style={{ width: `${(bar.value / max) * 100}%` }} />
          </div>
          <span className="tabular-nums">{format(bar.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function PlainLegend({ series }: { series: PlainSeries[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {series.map((entry) => (
        <span key={entry.id} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", SERIES_COLORS[entry.color].swatch)} />
          {entry.label}
        </span>
      ))}
    </div>
  );
}

/** A grid of cells shaded by their value: weekdays by hours. */
export function PlainHeatmap({
  columns,
  rows,
  format = String,
}: {
  columns: string[];
  rows: { label: string; values: number[] }[];
  format?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((row) => row.values));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-[10px] text-muted-foreground">
        <thead>
          <tr>
            <th />
            {columns.map((column) => (
              <th key={column} className="font-normal">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th className="pr-1 text-left font-normal">{row.label}</th>
              {row.values.map((value, index) => (
                <td key={columns[index]} title={`${row.label} ${columns[index]} : ${format(value)}`} className="relative h-6 min-w-5 rounded-sm bg-muted">
                  <span className={cn("absolute inset-0 rounded-sm", SERIES_COLORS.blue.swatch)} style={{ opacity: value / max }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A plain table: the first column left, the others right-aligned figures. */
export function PlainTable({ columns, rows }: { columns: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            {columns.map((column, index) => (
              <th key={column} className={cn("px-2 py-1.5 font-medium", index === 0 ? "text-left" : "text-right")}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-0">
              {row.map((cell, index) => (
                <td key={columns[index]} className={cn("px-2 py-1.5", index === 0 ? "max-w-80 break-all font-mono text-xs" : "text-right tabular-nums")}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

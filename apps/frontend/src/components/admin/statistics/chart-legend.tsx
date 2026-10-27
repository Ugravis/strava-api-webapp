import { cn } from "@/lib/utils";
import { SERIES_COLORS, type SeriesColorName } from "./palette";

/** Swatches naming the series of a chart, so that color is never alone. */
export function ChartLegend({ items, label }: { items: { id: string; label: string; color: SeriesColorName }[]; label: string }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label={label}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-2.5 rounded-xs", SERIES_COLORS[item.color].swatch)} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

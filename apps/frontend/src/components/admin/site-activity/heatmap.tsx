import { cn } from "@/lib/utils";

interface WeekHeatmapProps {
  /** Every cell of the week: ISO weekday (1 Monday) and hour. */
  cells: { weekday: number; hour: number; views: number }[];
  /** Short names of the days, Monday first. */
  days: string[];
  label: string;
  /** Title of a cell, its figures formatted. */
  title: (cell: { weekday: number; hour: number; views: number }) => string;
  legend: { less: string; more: string };
}

/** Views per weekday and hour, a single hue from light to dark; each cell titled with its figures. */
export function WeekHeatmap({ cells, days, label, title, legend }: WeekHeatmapProps) {
  const max = Math.max(...cells.map((cell) => cell.views), 1);
  const byCell = new Map(cells.map((cell) => [`${cell.weekday}-${cell.hour}`, cell]));
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-1">
        <div role="img" aria-label={label} className="grid min-w-[560px] grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-0.75">
          <span />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-center text-[10px] text-muted-foreground tabular-nums">
              {hour % 3 === 0 ? hour : ""}
            </span>
          ))}
          {days.map((day, index) => (
            <div key={day} className="contents">
              <span className="self-center text-[11px] text-muted-foreground">{day}</span>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = byCell.get(`${index + 1}-${hour}`) ?? { weekday: index + 1, hour, views: 0 };
                return (
                  <span key={hour} title={title(cell)} className={cn("relative aspect-square overflow-hidden rounded-[3px]", cell.views === 0 ? "bg-muted/60" : "bg-muted")}>
                    {cell.views > 0 && (
                      <span className="absolute inset-0 bg-[#2a78d6] dark:bg-[#3987e5]" style={{ opacity: 0.15 + (cell.views / max) * 0.85 }} aria-hidden />
                    )}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        {legend.less}
        {[0.15, 0.36, 0.57, 0.78, 1].map((opacity) => (
          <span key={opacity} className="relative size-3 overflow-hidden rounded-[3px] bg-muted">
            <span className="absolute inset-0 bg-[#2a78d6] dark:bg-[#3987e5]" style={{ opacity }} />
          </span>
        ))}
        {legend.more}
      </div>
    </div>
  );
}

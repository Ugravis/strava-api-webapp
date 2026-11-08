"use client";

import { useState } from "react";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart } from "./bar-chart";

export interface MonthBars {
  key: string;
  /** Name of the month, on its button. */
  label: string;
  labels: string[];
  titles: string[];
  counts: number[];
}

interface MonthHistogramProps {
  /** Oldest first; the latest is shown first. */
  months: MonthBars[];
  series: string;
  shareLabel: string;
  /** Names the choice of the month. */
  label: string;
  color?: SeriesColorName;
  height?: number;
}

/** One chart of the size of its neighbours, its month chosen above it. */
export function MonthHistogram({ months, series, shareLabel, label, color = "aqua", height }: MonthHistogramProps) {
  const [chosen, setChosen] = useState(months.at(-1)?.key);
  const month = months.find((entry) => entry.key === chosen) ?? months.at(-1);
  if (!month) return null;
  return (
    <>
      <ToggleGroup variant="outline" size="sm" spacing={0} aria-label={label} value={[month.key]} onValueChange={(next) => next[0] && setChosen(next[0])}>
        {months.map((entry) => (
          <ToggleGroupItem key={entry.key} value={entry.key} className="first-letter:uppercase">
            {entry.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <BarChart
        labels={month.labels}
        titles={month.titles}
        series={[{ id: "count", label: series, color }]}
        values={{ count: month.counts }}
        shareLabel={shareLabel}
        label={`${label} · ${month.label}`}
        height={height}
      />
    </>
  );
}

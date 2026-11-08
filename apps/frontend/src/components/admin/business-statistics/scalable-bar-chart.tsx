"use client";

import { type ReactNode, useState } from "react";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { ChartHead } from "@/components/admin/site-activity/parts";
import { Switch } from "@/components/ui/switch";

type BarChartProps = Parameters<typeof BarChart>[0];

/** A bar chart whose axis turns logarithmic with a switch, its figures above. */
export function ScalableBarChart({ figures, switchLabel, ...chart }: Omit<BarChartProps, "log"> & { figures?: ReactNode; switchLabel: string }) {
  const [log, setLog] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ChartHead
        figures={figures}
        legend={
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none">
            <Switch size="sm" checked={log} onCheckedChange={setLog} />
            {switchLabel}
          </label>
        }
      />
      <BarChart {...chart} log={log} />
    </div>
  );
}

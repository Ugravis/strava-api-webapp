"use client";

import type { AdminStravaUsagePoint } from "@kilotrace/shared/admin";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TimeSeriesChart } from "./time-series-chart";

type Period = "days" | "quarters";

interface StravaUsageChartProps {
  days: AdminStravaUsagePoint[];
  quarters: AdminStravaUsagePoint[];
  labels: {
    days: string;
    quarters: string;
    period: string;
    read: string;
    dailyLimit: string;
    shortLimit: string;
    /** The limits named when far above the usage. */
    dailyLimitCaption: string;
    shortLimitCaption: string;
    overall: string;
    chart: string;
    empty: string;
  };
}

/** The read quota used each day of the period, or each quarter of the last 24 hours, under its limit. */
export function StravaUsageChart({ days, quarters, labels }: StravaUsageChartProps) {
  const [period, setPeriod] = useState<Period>("days");
  const usage = period === "days" ? days : quarters;
  const empty = usage.every((entry) => entry.read === null && entry.overall === null);
  // The limit holds for the whole period, slots without any call included.
  const knownLimit = usage.findLast((entry) => entry.readLimit !== null)?.readLimit ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={labels.period}
        value={[period]}
        onValueChange={(next) => next[0] && setPeriod(next[0] as Period)}
      >
        <ToggleGroupItem value="days">{labels.days}</ToggleGroupItem>
        <ToggleGroupItem value="quarters">{labels.quarters}</ToggleGroupItem>
      </ToggleGroup>
      {empty ? (
        <p className="flex h-55 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <TimeSeriesChart
          unit={period === "days" ? "day" : "quarter"}
          label={labels.chart}
          series={[{ id: "read", label: labels.read, color: "blue" }]}
          points={usage.map((entry) => ({
            start: period === "days" ? entry.start.slice(0, 10) : entry.start,
            values: { read: entry.read },
          }))}
          limit={{
            label: period === "days" ? labels.dailyLimit : labels.shortLimit,
            values: usage.map((entry) => entry.readLimit ?? knownLimit),
          }}
          limitCaption={period === "days" ? labels.dailyLimitCaption : labels.shortLimitCaption}
          notes={[{ label: labels.overall, values: usage.map((entry) => entry.overall) }]}
        />
      )}
    </div>
  );
}

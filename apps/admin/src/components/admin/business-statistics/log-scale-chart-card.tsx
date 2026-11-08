"use client";

import { type ReactNode, useState } from "react";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { ChartHead } from "@/components/admin/site-activity/parts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@kilotrace/ui/components/ui/card";
import { Switch } from "@kilotrace/ui/components/ui/switch";

type BarChartProps = Parameters<typeof BarChart>[0];

interface LogScaleChartCardProps extends Omit<BarChartProps, "log"> {
  title: string;
  description?: string;
  className?: string;
  figures?: ReactNode;
  switchLabel: string;
}

/** A card of bars on a logarithmic axis, values far apart staying readable; a switch at its top right turns it linear. */
export function LogScaleChartCard({ title, description, className, figures, switchLabel, ...chart }: LogScaleChartCardProps) {
  const [log, setLog] = useState(true);
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground select-none">
            <Switch size="sm" checked={log} onCheckedChange={setLog} />
            {switchLabel}
          </label>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {figures && <ChartHead figures={figures} />}
        <BarChart {...chart} log={log} />
      </CardContent>
    </Card>
  );
}

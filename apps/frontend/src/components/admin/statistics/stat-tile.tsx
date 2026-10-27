import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** A line under the figure: a trend, a part of a quota. */
  detail?: ReactNode;
}

/** A headline figure of the statistics. */
export function StatTile({ icon: Icon, label, value, detail }: StatTileProps) {
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
    </Card>
  );
}

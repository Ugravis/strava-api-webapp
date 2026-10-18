import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** A key figure of the bands under the map, its label and the key of its color. */
export function Stat({ value, label, colorKey }: { value: ReactNode; label: string; colorKey: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 md:items-center">
      <span className="text-base leading-tight font-semibold tabular-nums">{value}</span>
      <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
        {colorKey}
        {label}
      </span>
    </div>
  );
}

/** A figure still loading. */
export const ValueSkeleton = () => <Skeleton className="h-5 w-12" />;

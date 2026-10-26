import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AccentBar, type MapColor } from "./map-keys";

/**
 * A key figure of the bands under the map: its label over its value, along
 * a bar in the color of what it counts on the map, when it has one.
 */
export function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: MapColor }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      {accent && <AccentBar color={accent} />}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="block text-xs leading-4 whitespace-nowrap text-muted-foreground first-letter:uppercase">{label}</span>
        <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums">{value}</span>
      </div>
    </div>
  );
}

/** Title of a group of figures or settings in the bands, small and in capitals. */
export function BandHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[0.7rem] font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase", className)}>
      {children}
    </span>
  );
}

/** Square holding the icon of a tool, in the blue of the tools in use. */
export function ToolIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-500/12 text-blue-600 dark:text-blue-400 [&_svg]:size-4"
    >
      {children}
    </span>
  );
}

/** A figure still loading. */
export const ValueSkeleton = () => <Skeleton className="h-4.5 w-12" />;

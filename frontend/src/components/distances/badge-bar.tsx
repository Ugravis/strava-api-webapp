"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useRevealed } from "./use-revealed";

interface BadgeBarProps {
  /** Share completed, in [0, 1]. */
  value: number;
  label: string;
  /** Height and color of the track. */
  className?: string;
  /** Color of the filled part. */
  fillClassName?: string;
}

/** Horizontal progress of a badge, filling up from zero when it appears. */
export function BadgeBar({ value, label, className, fillClassName }: BadgeBarProps) {
  const [ref, revealed] = useRevealed<HTMLDivElement>();

  return (
    <ProgressPrimitive.Root ref={ref} value={revealed ? value * 100 : 0} aria-label={label}>
      <ProgressTrack className={cn("h-1.5", className)}>
        <ProgressIndicator className={cn("duration-1000 ease-out motion-reduce:transition-none", fillClassName)} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

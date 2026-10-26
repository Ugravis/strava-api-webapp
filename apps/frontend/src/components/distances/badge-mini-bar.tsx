"use client";

import { cn } from "@/lib/utils";
import { progressTier } from "./progress-tier";
import { useRevealed } from "./use-revealed";

interface BadgeMiniBarProps {
  /** Share completed, in [0, 1]. */
  value: number;
  /** Classes of the track, e.g. its color on a background of its own. */
  className?: string;
}

/** Thin progress bar of a badge, colored by its tier, filling up from zero when it appears. */
export function BadgeMiniBar({ value, className }: BadgeMiniBarProps) {
  const [ref, revealed] = useRevealed<HTMLSpanElement>();
  return (
    <span ref={ref} className={cn("block h-1.5 overflow-hidden rounded-full bg-muted", className)} aria-hidden>
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none",
          progressTier(value).fill,
        )}
        style={{ width: revealed ? `${value * 100}%` : 0 }}
      />
    </span>
  );
}

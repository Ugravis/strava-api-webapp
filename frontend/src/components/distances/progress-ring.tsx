import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** Share completed, in [0, 1]. */
  value: number;
  label: string;
  className?: string;
  /** Color of the progress arc, e.g. `stroke-primary`. */
  indicatorClassName?: string;
  /** Content centered inside the ring. */
  children?: ReactNode;
}

const RADIUS = 46;
const STROKE_WIDTH = 8;

/** Circular progress bar drawn around its content. */
export function ProgressRing({ value, label, className, indicatorClassName = "stroke-primary", children }: ProgressRingProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("relative grid aspect-square place-items-center", className)}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={STROKE_WIDTH} className="stroke-muted" />
        {percent > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - percent}
            className={cn("transition-[stroke-dashoffset] duration-700 ease-out", indicatorClassName)}
          />
        )}
      </svg>
      {children}
    </div>
  );
}

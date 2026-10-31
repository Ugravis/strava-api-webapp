import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "",
  danger: "bg-destructive/5",
  warning: "border-l-4 border-l-amber-400 bg-amber-500/5",
};

/** A part of the detail under a small title; `aside` on its right, e.g. a button. Stacked with a line between. */
export function DetailSection({
  title,
  aside,
  tone = "default",
  className,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2 border-t p-4 first:border-t-0", TONES[tone], className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {title && <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * A row of buttons, wrapping on narrow panels, a line above it: under the
 * header, or between sections. `sticky` keeps it at the bottom of the panel
 * as the detail scrolls.
 */
export function DetailActions({ sticky, children }: { sticky?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4",
        "border-t py-3",
        sticky && "sticky bottom-0 z-10 mt-auto bg-background/95 supports-backdrop-filter:backdrop-blur",
      )}
    >
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { cn } from "@/lib/utils";

/**
 * One figure of the panel, in a `<dl>`: a label over its value, on a shaded
 * tile, or bare inside a frame already shaded.
 */
export function PanelFigure({ label, value, bare = false }: { label: string; value: string; bare?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", !bare && "rounded-lg bg-muted/60 px-3 py-2.5")}>
      <dt className="text-xs leading-tight text-muted-foreground">{label}</dt>
      <dd className="leading-snug font-semibold wrap-break-word tabular-nums">{value}</dd>
    </div>
  );
}

/** Grid of the figures of the panel. */
export function PanelFigures({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("grid grid-cols-3 gap-2", className)}>{children}</dl>;
}

/** Placeholders of `count` figures while they load. */
export function PanelFiguresSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-15 rounded-lg" />
      ))}
    </div>
  );
}

/** A section of the panel: its title, an optional action on its right, and its content. */
export function PanelSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h3 className="text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

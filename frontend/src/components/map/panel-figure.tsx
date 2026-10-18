import { Skeleton } from "@/components/ui/skeleton";

/** One figure of the panel, in a `<dl>`: a label over its value. */
export function PanelFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

/** Placeholders of `count` figures while they load. */
export function PanelFiguresSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-3 gap-3" aria-busy>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

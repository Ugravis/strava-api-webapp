import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-4 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
        <div className="grid gap-3 @lg:grid-cols-[12rem_1fr] @3xl:grid-cols-[13rem_1fr_1fr]">
          <Skeleton className="h-28 rounded-xl @lg:row-span-2 @lg:h-auto @lg:aspect-square @3xl:row-span-1" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, badge) => (
            <Skeleton key={badge} className="h-32 w-32 shrink-0 rounded-xl sm:w-36" />
          ))}
        </div>
      </div>
      <Skeleton className="h-15 w-full rounded-xl" />
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-2 gap-2 @xl:grid-cols-3 @4xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, badge) => (
              <Skeleton key={badge} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

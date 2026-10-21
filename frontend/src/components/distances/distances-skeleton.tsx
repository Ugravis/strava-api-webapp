import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <Skeleton className="h-72 rounded-2xl lg:h-44" />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="size-9" />
        <Skeleton className="h-9 w-18" />
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, badge) => (
              <div key={badge} className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
                <Skeleton className="size-12 flex-none rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

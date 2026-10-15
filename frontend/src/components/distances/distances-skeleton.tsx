import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 3 }, (_, badge) => (
              <div key={badge} className="flex flex-col items-center gap-1.5">
                <Skeleton className="size-14 rounded-full sm:size-16" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

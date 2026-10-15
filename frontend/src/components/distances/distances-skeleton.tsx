import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 3 }, (_, badge) => (
              <div key={badge} className="flex flex-col items-center gap-2">
                <Skeleton className="size-24 rounded-full sm:size-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

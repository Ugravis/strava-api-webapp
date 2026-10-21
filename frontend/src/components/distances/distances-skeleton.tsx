import { Skeleton } from "@/components/ui/skeleton";

export function DistancesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="flex flex-col gap-5 rounded-2xl bg-zinc-900 p-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="h-9 w-40 bg-white/10" />
        </div>
        <div className="grid gap-3 @2xl:grid-cols-2">
          <Skeleton className="h-24 rounded-xl bg-white/10" />
          <Skeleton className="h-24 rounded-xl bg-white/10" />
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
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

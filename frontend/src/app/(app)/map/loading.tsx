import { MapSkeleton } from "@/components/map/map-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the map and its band of figures while the page loads. */
export default function MapPageLoading() {
  return (
    <div className="flex min-h-[60svh] flex-1 flex-col" aria-busy>
      <div className="relative flex-1">
        <MapSkeleton />
      </div>
      <div className="flex shrink-0 gap-8 border-t px-4 py-3 md:px-5">
        {[0, 1, 2].map((section) => (
          <div key={section} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

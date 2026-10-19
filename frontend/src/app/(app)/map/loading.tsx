import { MapSkeleton } from "@/components/map/map-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder for the map and its band while the page loads: the tools and modules, then the figures of the tiles. */
export default function MapPageLoading() {
  return (
    <div className="flex min-h-[60svh] flex-1 flex-col" aria-busy>
      <div className="relative flex-1">
        <MapSkeleton />
      </div>
      <div className="flex shrink-0 flex-col border-t md:flex-row">
        <div className="flex shrink-0 gap-1.5 border-b px-3 py-2 md:gap-8 md:border-r md:border-b-0 md:px-4 md:py-3">
          {[0, 1].map((group) => (
            <div key={group} className="flex gap-1.5 md:flex-col md:gap-2">
              <Skeleton className="hidden h-4 w-14 md:block" />
              <Skeleton className="h-7 w-7 sm:w-24" />
              <Skeleton className="h-7 w-7 sm:w-24" />
            </div>
          ))}
        </div>
        <div className="flex flex-1 gap-8 px-4 py-3 md:justify-around md:px-6">
          {[0, 1, 2].map((section) => (
            <div key={section} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { MapSkeleton } from "@/components/map/map-skeleton";

/** Placeholder for the map while the page loads: it fills the space beside the sidebar. */
export default function MapPageLoading() {
  return (
    <div className="relative min-h-[60svh] flex-1">
      <MapSkeleton />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { SiteActivityTabSkeleton } from "../site-activity/skeletons";
import { BusinessKpisSkeleton } from "./kpis";

/** Placeholder of the business statistics, in the layout of the page. */
export default function AdminBusinessStatisticsLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <BusinessKpisSkeleton />
      <Skeleton className="h-10 w-full rounded-lg" />
      <SiteActivityTabSkeleton />
    </>
  );
}

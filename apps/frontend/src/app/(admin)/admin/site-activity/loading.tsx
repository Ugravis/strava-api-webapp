import { Skeleton } from "@/components/ui/skeleton";
import { SiteActivityKpisSkeleton } from "./kpis";
import { SiteActivityTabSkeleton } from "./skeletons";

/** Placeholder of the site activity, in the layout of the page. */
export default function AdminSiteActivityLoading() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <SiteActivityKpisSkeleton />
      <Skeleton className="h-10 w-full rounded-lg" />
      <SiteActivityTabSkeleton />
    </>
  );
}

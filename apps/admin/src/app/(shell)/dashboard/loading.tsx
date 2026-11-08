import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { DashboardAttentionSkeleton } from "./attention";
import { DashboardHeroSkeleton } from "./hero";
import { DashboardKpisSkeleton } from "./kpis";
import { DashboardCardSkeleton } from "./parts";

/** Placeholder of the dashboard, the fallbacks of its first bands in their order. */
export default function AdminDashboardLoading() {
  return (
    <>
      <DashboardHeroSkeleton />
      <DashboardAttentionSkeleton />
      <Skeleton className="-mb-2 h-5 w-24" />
      <DashboardKpisSkeleton />
      <Skeleton className="-mb-2 h-5 w-32" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCardSkeleton chart />
        <DashboardCardSkeleton chart />
      </div>
    </>
  );
}

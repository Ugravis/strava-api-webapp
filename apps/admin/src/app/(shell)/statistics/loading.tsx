import { BUSINESS_TABS } from "@/components/admin/business-statistics/tabs";
import { TabsSkeleton, ViewHeaderSkeleton } from "@/components/admin/page-skeleton";
import { SiteActivityTabSkeleton } from "../site-activity/skeletons";
import { BusinessKpisSkeleton } from "./kpis";

/** Placeholder of the business statistics, in the layout of the page. */
export default function AdminBusinessStatisticsLoading() {
  return (
    <>
      <ViewHeaderSkeleton title="w-56" />
      <BusinessKpisSkeleton />
      <TabsSkeleton count={BUSINESS_TABS.length} />
      <SiteActivityTabSkeleton />
    </>
  );
}

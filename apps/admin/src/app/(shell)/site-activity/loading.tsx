import { SITE_ACTIVITY_TABS } from "@/components/admin/site-activity/tabs";
import { TabsSkeleton, ViewHeaderSkeleton } from "@/components/admin/page-skeleton";
import { SiteActivityKpisSkeleton } from "./kpis";
import { SiteActivityTabSkeleton } from "./skeletons";

/** Placeholder of the site activity, in the layout of the page. */
export default function AdminSiteActivityLoading() {
  return (
    <>
      <ViewHeaderSkeleton toggles={2} />
      <SiteActivityKpisSkeleton />
      <TabsSkeleton count={SITE_ACTIVITY_TABS.length} />
      <SiteActivityTabSkeleton />
    </>
  );
}

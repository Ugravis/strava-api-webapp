import { Suspense } from "react";
import { BusinessTabs } from "@/components/admin/business-statistics/business-tabs";
import { BUSINESS_TABS, type BusinessTab } from "@/components/admin/business-statistics/tabs";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { SiteActivityTabSkeleton } from "../site-activity/skeletons";
import { AccountsTab } from "./accounts";
import { CommunityTab } from "./community";
import { type BusinessView, viewHref, viewOf } from "./data";
import { ExplorationTab } from "./exploration";
import { BusinessFacts, BusinessFactsSkeleton, BusinessHeader } from "./header";
import { BusinessKpis, BusinessKpisSkeleton } from "./kpis";
import { SportsTab } from "./sports";
import { StravaTab } from "./strava";

const TABS: Record<BusinessTab, (props: { view: BusinessView }) => Promise<React.JSX.Element>> = {
  accounts: AccountsTab,
  sports: SportsTab,
  exploration: ExplorationTab,
  community: CommunityTab,
  strava: StravaTab,
};

/**
 * The figures of the product, aggregated: the period and the headline
 * figures, then a tab per part. The use of the site itself belongs to the
 * site activity. The period, the team and the tab live in the address
 * (`?period=&team=&tab=`); each block streams on its own and degrades alone
 * when its call fails.
 */
export default async function AdminBusinessStatisticsPage({ searchParams }: PageProps<"/admin/statistics">) {
  const [, params] = await Promise.all([requireAdminMember(), searchParams]);
  const view = viewOf(params);
  const t = getAdminTranslations("businessStatistics.tabs");
  const Tab = TABS[view.tab];
  // Keyed by the view, so that a new choice shows the skeletons instead of the figures of the previous one.
  const choice = `${view.period}-${view.team}`;

  return (
    <>
      <BusinessHeader
        view={view}
        description={
          <Suspense key={choice} fallback={<BusinessFactsSkeleton />}>
            <BusinessFacts view={view} />
          </Suspense>
        }
      />

      <Suspense key={choice} fallback={<BusinessKpisSkeleton />}>
        <BusinessKpis view={view} />
      </Suspense>

      <BusinessTabs value={view.tab} label={t("label")} tabs={BUSINESS_TABS.map((tab) => ({ id: tab, label: t(tab), href: viewHref(view, { tab }) }))} />

      <Suspense key={`${choice}-${view.tab}`} fallback={<SiteActivityTabSkeleton />}>
        <Tab view={view} />
      </Suspense>
    </>
  );
}

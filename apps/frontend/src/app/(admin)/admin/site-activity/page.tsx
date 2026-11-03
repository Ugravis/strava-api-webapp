import { Suspense } from "react";
import { SiteActivityTabs } from "@/components/admin/site-activity/site-activity-tabs";
import { SITE_ACTIVITY_TABS, type SiteActivityTab } from "@/components/admin/site-activity/tabs";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { AudienceTab } from "./audience";
import { viewHref, viewOf, type SiteActivityView } from "./data";
import { FunnelTab } from "./funnel";
import { SiteActivityFacts, SiteActivityFactsSkeleton, SiteActivityHeader } from "./header";
import { SiteActivityKpis, SiteActivityKpisSkeleton } from "./kpis";
import { PagesTab } from "./pages";
import { ParamsTab } from "./params";
import { RetentionTab } from "./retention";
import { SessionsTab } from "./sessions";
import { SiteActivityTabSkeleton } from "./skeletons";

const TABS: Record<SiteActivityTab, (props: { view: SiteActivityView }) => Promise<React.JSX.Element>> = {
  audience: AudienceTab,
  retention: RetentionTab,
  pages: PagesTab,
  sessions: SessionsTab,
  params: ParamsTab,
  funnel: FunnelTab,
};

/**
 * Everything of the use of the site by the signed-in users, aggregated: the
 * period and the headline figures, then a tab per part. The period, the team
 * and the tab live in the address (`?days=&team=&tab=`); each block streams
 * on its own and degrades alone when its call fails.
 */
export default async function AdminSiteActivityPage({ searchParams }: PageProps<"/admin/site-activity">) {
  const [, params] = await Promise.all([requireAdminMember(), searchParams]);
  const view = viewOf(params);
  const t = getAdminTranslations("siteActivity.tabs");
  const Tab = TABS[view.tab];
  // Keyed by the view, so that a new choice shows the skeletons instead of the figures of the previous one.
  const period = `${view.days}-${view.team}-${view.admin}`;
  const key = `${period}-${view.tab}`;

  return (
    <>
      <SiteActivityHeader
        view={view}
        description={
          <Suspense key={period} fallback={<SiteActivityFactsSkeleton />}>
            <SiteActivityFacts view={view} />
          </Suspense>
        }
      />

      <Suspense key={period} fallback={<SiteActivityKpisSkeleton />}>
        <SiteActivityKpis view={view} />
      </Suspense>

      <SiteActivityTabs
        value={view.tab}
        label={t("label")}
        tabs={SITE_ACTIVITY_TABS.map((tab) => ({ id: tab, label: t(tab), href: viewHref(view, { tab }) }))}
      />

      <Suspense key={key} fallback={<SiteActivityTabSkeleton />}>
        <Tab view={view} />
      </Suspense>
    </>
  );
}

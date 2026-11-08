import { type ReactNode, Suspense } from "react";
import { ViewPending, ViewPendingProvider } from "@/components/admin/site-activity/view-controls";
import { requireAdminMember } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardAttention, DashboardAttentionSkeleton } from "./attention";
import { DashboardSignups, DashboardSiteActivity, DashboardSports, DashboardTopPages, TeamSwitch } from "./charts";
import { DashboardExploration, DashboardReleaseNote } from "./community";
import { DashboardHero, DashboardHeroSkeleton } from "./hero";
import { DashboardKpis, DashboardKpisSkeleton } from "./kpis";
import { DashboardRecentUsers, DashboardTeamActivity } from "./lists";
import { DashboardCardSkeleton } from "./parts";
import { DashboardSystemHealth } from "./system-health";

/** A title above a band of the dashboard, with its controls on the right. */
function BandTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <div className="-mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Home of the back office: the member greeted, what needs the team first,
 * the headline figures of the community, the activity of the site, the
 * exploration of the community, then the release, the system and the
 * latest of the site and of the team. Each block streams on its own and degrades alone
 * when its call fails. `?team=true` counts the team in the site activity.
 */
export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin/dashboard">) {
  const [me, params] = await Promise.all([requireAdminMember(), searchParams]);
  const team = params.team === "true";
  const t = getAdminTranslations("dashboard.bands");

  return (
    <>
      <Suspense fallback={<DashboardHeroSkeleton />}>
        <DashboardHero memberId={me.id} roles={me.roles} />
      </Suspense>

      <Suspense fallback={<DashboardAttentionSkeleton />}>
        <DashboardAttention />
      </Suspense>

      <BandTitle>{t("community")}</BandTitle>
      <Suspense fallback={<DashboardKpisSkeleton />}>
        <DashboardKpis />
      </Suspense>

      <ViewPendingProvider>
        <BandTitle action={<TeamSwitch team={team} />}>{t("activity")}</BandTitle>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ViewPending fallback={<DashboardCardSkeleton chart />}>
            <Suspense key={`activity-${team}`} fallback={<DashboardCardSkeleton chart />}>
              <DashboardSiteActivity team={team} />
            </Suspense>
          </ViewPending>
          <Suspense fallback={<DashboardCardSkeleton chart />}>
            <DashboardSignups />
          </Suspense>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ViewPending fallback={<DashboardCardSkeleton rows={6} className="lg:col-span-2" />}>
            <Suspense key={`pages-${team}`} fallback={<DashboardCardSkeleton rows={6} className="lg:col-span-2" />}>
              <DashboardTopPages team={team} />
            </Suspense>
          </ViewPending>
          <Suspense fallback={<DashboardCardSkeleton chart />}>
            <DashboardSports />
          </Suspense>
        </div>
      </ViewPendingProvider>

      <BandTitle>{t("exploration")}</BandTitle>
      <Suspense fallback={<DashboardKpisSkeleton />}>
        <DashboardExploration />
      </Suspense>

      <BandTitle>{t("operations")}</BandTitle>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense fallback={<DashboardCardSkeleton rows={4} />}>
          <DashboardReleaseNote />
        </Suspense>
        <Suspense fallback={<DashboardCardSkeleton rows={6} />}>
          <DashboardSystemHealth />
        </Suspense>
      </div>

      <BandTitle>{t("latest")}</BandTitle>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Suspense fallback={<DashboardCardSkeleton rows={14} className="lg:col-span-2" />}>
          <DashboardTeamActivity />
        </Suspense>
        <Suspense fallback={<DashboardCardSkeleton rows={14} />}>
          <DashboardRecentUsers />
        </Suspense>
      </div>
    </>
  );
}

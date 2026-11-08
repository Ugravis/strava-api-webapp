import { ADMIN_SPORT_FAMILIES, ADMIN_STATISTICS_DAYS, type AdminSportFamily } from "@kilotrace/shared/admin";
import { getFormatter } from "next-intl/server";
import { ViewToggle } from "@/components/admin/site-activity/view-controls";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { DonutChart } from "@/components/admin/statistics/donut-chart";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { DASHBOARD_ACTIVITY_DAYS, dashboardData } from "./data";
import { DashboardCard, DashboardUnavailable } from "./parts";

const CHART_HEIGHT = 220;

/** Pages of the ranking of the most viewed. */
const TOP_PAGES = 6;

/** Families in the colors of the statistics page. */
const FAMILY_COLORS = {
  ride: "blue",
  run: "orange",
  hike: "aqua",
  swim: "yellow",
  other: "muted",
} as const satisfies Record<AdminSportFamily, SeriesColorName>;

/** A figure summing the period, above a chart. */
function ChartTotal({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/** Whether the team is counted, kept in `?team=` so that the choice is shared and survives a reload. */
export function TeamSwitch({ team }: { team: boolean }) {
  const t = getAdminTranslations("dashboard.siteActivity");
  return <ViewToggle label={t("withTeam")} checked={team} href={team ? adminRoutes.dashboard : `${adminRoutes.dashboard}?team=true`} />;
}

/** Users active each day, new or back, with the pages they viewed. */
export async function DashboardSiteActivity({ team }: { team: boolean }) {
  const t = getAdminTranslations("dashboard.siteActivity");
  const [format, users, pages] = await Promise.all([getFormatter(), dashboardData.activeUsers(team), dashboardData.pageViews(team)]);
  const series = [
    { id: "returning", label: t("returning"), color: "blue" as const },
    { id: "new", label: t("new"), color: "aqua" as const },
  ];
  const views = new Map(pages?.daily.map((day) => [day.date, day.views]));
  return (
    <DashboardCard title={t("title")} description={t(team ? "descriptionTeam" : "description", { days: DASHBOARD_ACTIVITY_DAYS })} href={adminRoutes.siteActivity}>
      {users ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex gap-6">
              {pages && <ChartTotal value={format.number(pages.daily.reduce((sum, day) => sum + day.views, 0))} label={t("views")} />}
              <ChartTotal value={format.number(users.newVsReturning.reduce((sum, day) => sum + day.new + day.returning, 0))} label={t("activeDays")} />
            </div>
            <ChartLegend items={series} label={t("legend")} />
          </div>
          <TimeSeriesChart
            unit="day"
            height={CHART_HEIGHT}
            label={t("chart", { days: DASHBOARD_ACTIVITY_DAYS })}
            totalLabel={t("total")}
            series={series}
            points={users.newVsReturning.map((day) => ({ start: day.date, values: { returning: day.returning, new: day.new } }))}
            notes={pages ? [{ label: t("views"), values: users.newVsReturning.map((day) => views.get(day.date) ?? 0) }] : undefined}
          />
        </div>
      ) : (
        <DashboardUnavailable />
      )}
    </DashboardCard>
  );
}

/** Sign-ups of each day of the statistics period. */
export async function DashboardSignups() {
  const t = getAdminTranslations("dashboard.signups");
  const [format, statistics] = await Promise.all([getFormatter(), dashboardData.statistics()]);
  const total = statistics?.users.signups.reduce((sum, day) => sum + day.count, 0) ?? 0;
  return (
    <DashboardCard title={t("title")} description={t("description", { days: ADMIN_STATISTICS_DAYS })} href={adminRoutes.statistics}>
      {statistics ? (
        // Bottom-aligned: the card may be stretched to the height of its neighbour.
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex gap-6">
            <ChartTotal value={format.number(total)} label={t("total", { days: ADMIN_STATISTICS_DAYS })} />
            <ChartTotal
              value={statistics.users.previousSignups > 0 ? format.number((total - statistics.users.previousSignups) / statistics.users.previousSignups, { style: "percent", signDisplay: "exceptZero", maximumFractionDigits: 0 }) : "–"}
              label={t("trend")}
            />
          </div>
          <TimeSeriesChart
            unit="day"
            height={CHART_HEIGHT}
            label={t("chart", { days: ADMIN_STATISTICS_DAYS })}
            series={[{ id: "count", label: t("series"), color: "blue" }]}
            points={statistics.users.signups.map((day) => ({ start: day.date, values: { count: day.count } }))}
          />
        </div>
      ) : (
        <DashboardUnavailable />
      )}
    </DashboardCard>
  );
}

/** The pages viewed the most over the period, as bars of their share of the views. */
export async function DashboardTopPages({ team }: { team: boolean }) {
  const t = getAdminTranslations("dashboard.topPages");
  const [format, pages] = await Promise.all([getFormatter(), dashboardData.pageViews(team)]);
  const top = pages?.pages.slice(0, TOP_PAGES) ?? [];
  const max = Math.max(...top.map((page) => page.views), 1);
  return (
    <DashboardCard
      title={t("title")}
      description={t(team ? "descriptionTeam" : "description", { days: DASHBOARD_ACTIVITY_DAYS })}
      href={`${adminRoutes.siteActivity}?days=${DASHBOARD_ACTIVITY_DAYS}&team=${team}&tab=pages`}
      className="lg:col-span-2"
    >
      {!pages ? (
        <DashboardUnavailable />
      ) : top.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {top.map((page) => (
            <li key={page.path} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <code className="truncate font-mono text-xs">{page.path}</code>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t("figures", { views: format.number(page.views), users: page.users })}
                </span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(page.views / max) * 100}%` }} />
              </span>
            </li>
          ))}
        </ol>
      )}
    </DashboardCard>
  );
}

/** Activities synchronized over the period, by family of sports. */
export async function DashboardSports() {
  const t = getAdminTranslations("dashboard.sports");
  const families = getAdminTranslations("businessStatistics.families");
  const statistics = await dashboardData.statistics();
  const totals = Object.fromEntries(
    ADMIN_SPORT_FAMILIES.map((family) => [family, statistics?.activities.synced.reduce((sum, day) => sum + day.families[family], 0) ?? 0]),
  ) as Record<AdminSportFamily, number>;
  return (
    <DashboardCard title={t("title")} description={t("description", { days: ADMIN_STATISTICS_DAYS })} href={adminRoutes.statistics}>
      {statistics ? (
        <DonutChart
          label={t("chart")}
          totalLabel={t("total")}
          emptyLabel={t("empty")}
          divided
          segments={ADMIN_SPORT_FAMILIES.map((family) => ({ id: family, label: families(family), value: totals[family], color: FAMILY_COLORS[family] }))}
        />
      ) : (
        <DashboardUnavailable />
      )}
    </DashboardCard>
  );
}

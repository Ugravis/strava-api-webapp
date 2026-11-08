import { ActivityIcon, GaugeIcon, UsersIcon, UserCheckIcon } from "lucide-react";
import { getFormatter } from "next-intl/server";
import { Progress } from "@kilotrace/ui/components/ui/progress";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { cn } from "@kilotrace/ui/lib/utils";
import { dashboardData } from "./data";
import { KpiGrid, KpiTile, KpiTileSkeleton } from "@/components/admin/kpi-tile";

/** Share of the Strava read quota from which it is flagged. */
export const QUOTA_WARNING = 0.8;

/** Change from `previous` to `current`, none without a base. */
const ratioOf = (current: number, previous: number) => (previous > 0 ? (current - previous) / previous : null);

/** The four headline figures, each opening its page. */
export async function DashboardKpis() {
  const t = getAdminTranslations("dashboard.kpis");
  const [format, statistics, users, week, active] = await Promise.all([
    getFormatter(),
    dashboardData.statistics(),
    dashboardData.users(),
    dashboardData.week(),
    dashboardData.activeUsers(false),
  ]);
  const percent = (ratio: number) => format.number(ratio, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
  const trend = (ratio: number | null) => (ratio === null ? null : { ratio, text: percent(ratio) });
  const none = t("unavailable");

  const signups = statistics?.users.signups.map((day) => day.count) ?? [];
  const recentSignups = signups.reduce((sum, count) => sum + count, 0);
  const synced = statistics?.activities.synced.map((day) => Object.values(day.families).reduce((sum, count) => sum + count, 0)) ?? [];
  const today = statistics?.stravaUsage.days.at(-1);
  const quota = today?.read != null && today.readLimit ? today.read / today.readLimit : null;

  return (
    <KpiGrid>
      <KpiTile
        icon={UsersIcon}
        label={t("users")}
        href={adminRoutes.users}
        color="blue"
        value={users ? format.number(users.total) : none}
        trend={statistics ? trend(ratioOf(recentSignups, statistics.users.previousSignups)) : null}
        detail={users && t("usersDetail", { count: users.signups })}
        spark={signups}
      />
      <KpiTile
        icon={UserCheckIcon}
        label={t("active")}
        href={adminRoutes.siteActivity}
        color="aqua"
        value={week ? format.number(week.current.activeUsers) : none}
        trend={week ? trend(ratioOf(week.current.activeUsers, week.previous.activeUsers)) : null}
        detail={week && t("activeDetail", { value: format.number(week.previous.activeUsers) })}
        spark={active?.newVsReturning.map((day) => day.new + day.returning)}
      />
      <KpiTile
        icon={ActivityIcon}
        label={t("activities")}
        href={adminRoutes.statistics}
        color="orange"
        value={statistics ? format.number(statistics.activities.total) : none}
        detail={statistics && t("activitiesDetail", { count: synced.reduce((sum, count) => sum + count, 0) })}
        spark={synced}
      />
      <KpiTile
        icon={GaugeIcon}
        label={t("quota")}
        href={adminRoutes.statistics}
        color="yellow"
        value={quota === null ? "–" : format.number(quota, { style: "percent", maximumFractionDigits: 0 })}
        detail={
          quota !== null && today?.read != null && today.readLimit
            ? t("quotaDetail", { used: format.number(today.read), limit: format.number(today.readLimit) })
            : t("quotaUnknown")
        }
        footer={<Progress value={Math.min((quota ?? 0) * 100, 100)} className={cn(quota !== null && quota >= QUOTA_WARNING && "[&_[data-slot=progress-indicator]]:bg-destructive")} />}
      />
    </KpiGrid>
  );
}

export function DashboardKpisSkeleton() {
  return (
    <KpiGrid>
      {Array.from({ length: 4 }, (_, index) => (
        <KpiTileSkeleton key={index} />
      ))}
    </KpiGrid>
  );
}

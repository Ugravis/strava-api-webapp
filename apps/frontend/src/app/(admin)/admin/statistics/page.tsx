import {
  ADMIN_STATISTICS_DAYS,
  AdminRole,
  type AdminStatisticsResponse,
  type AdminStravaUsagePoint,
} from "@kilotrace/shared/admin";
import { ActivityIcon, GaugeIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { getFormatter } from "next-intl/server";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { DonutChart } from "@/components/admin/statistics/donut-chart";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { StravaUsageChart } from "@/components/admin/statistics/strava-usage-chart";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";

const days = ADMIN_STATISTICS_DAYS;

/** The read limit of the latest slot with a Strava call. */
const latestLimit = (usage: AdminStravaUsagePoint[]) =>
  usage.findLast((entry) => entry.readLimit !== null)?.readLimit ?? 0;

/** Families in their fixed order, with the colors of the dashboard. */
const FAMILY_COLORS = {
  ride: "blue",
  run: "orange",
  hike: "aqua",
  swim: "yellow",
  other: "muted",
} as const satisfies Record<keyof AdminStatisticsResponse["activities"]["synced"][number]["families"], SeriesColorName>;

export default async function AdminStatisticsPage() {
  await requireAdminRole(AdminRole.Support);
  const t = getAdminTranslations("statistics");
  const format = await getFormatter();
  const result = await adminApi<AdminStatisticsResponse>("/statistics");

  if (!result.ok) {
    return (
      <>
        <PageHeader title={t("title")} />
        <Card>
          <CardContent className="text-sm text-muted-foreground">{t("error")}</CardContent>
        </Card>
      </>
    );
  }

  const { users, follows, activities, stravaUsage, notifications, generatedAt } = result.data;
  const recentSignups = users.signups.reduce((sum, day) => sum + day.count, 0);
  const recentActivities = activities.synced.reduce(
    (sum, day) => sum + Object.values(day.families).reduce((total, count) => total + count, 0),
    0,
  );
  const today = stravaUsage.days[stravaUsage.days.length - 1];
  const families = (Object.keys(FAMILY_COLORS) as (keyof typeof FAMILY_COLORS)[]).map((family) => ({
    id: family,
    label: t(`activities.families.${family}`),
    color: FAMILY_COLORS[family],
  }));

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description", {
          days,
          time: format.dateTime(new Date(generatedAt), { hour: "2-digit", minute: "2-digit" }),
        })}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          icon={UserPlusIcon}
          label={t("tiles.users")}
          value={format.number(users.total)}
          detail={
            <>
              {t("tiles.usersDetail", { count: recentSignups, days })}
              {users.previousSignups > 0 && (
                <span className="block">
                  {t("tiles.trend", {
                    days,
                    trend: format.number((recentSignups - users.previousSignups) / users.previousSignups, {
                      style: "percent",
                      signDisplay: "exceptZero",
                      maximumFractionDigits: 0,
                    }),
                  })}
                </span>
              )}
            </>
          }
        />
        <StatTile
          icon={ActivityIcon}
          label={t("tiles.activities")}
          value={format.number(activities.total)}
          detail={t("tiles.activitiesDetail", { count: recentActivities, days })}
        />
        <StatTile
          icon={UsersIcon}
          label={t("tiles.follows")}
          value={format.number(follows.accepted)}
          detail={t("tiles.followsDetail", { count: follows.pending })}
        />
        <StatTile
          icon={GaugeIcon}
          label={t("tiles.quota")}
          value={
            today.read !== null && today.readLimit
              ? format.number(today.read / today.readLimit, { style: "percent", maximumFractionDigits: 0 })
              : "–"
          }
          detail={
            today.read !== null && today.readLimit ? (
              <span className="flex flex-col gap-2">
                <Progress value={Math.min((today.read / today.readLimit) * 100, 100)} />
                {t("tiles.quotaDetail", { used: format.number(today.read), limit: format.number(today.readLimit) })}
              </span>
            ) : (
              t("tiles.quotaUnknown")
            )
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="order-1 lg:order-none lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("signups.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeSeriesChart
              unit="day"
              label={t("signups.chart", { days })}
              series={[{ id: "count", label: t("signups.series"), color: "blue" }]}
              points={users.signups.map((day) => ({ start: day.date, values: { count: day.count } }))}
            />
          </CardContent>
        </Card>
        <Card className="order-3 lg:order-none">
          <CardHeader>
            <CardTitle>{t("follows.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <DonutChart
              label={t("follows.chart")}
              totalLabel={t("follows.total")}
              emptyLabel={t("follows.empty")}
              segments={[
                { id: "accepted", label: t("follows.accepted"), value: follows.accepted, color: "blue" },
                { id: "pending", label: t("follows.pending"), value: follows.pending, color: "orange" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="order-2 lg:order-none lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("activities.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ChartLegend label={t("activities.legend")} items={families} />
            <TimeSeriesChart
              unit="day"
              label={t("activities.chart", { days })}
              totalLabel={t("activities.total")}
              series={families}
              points={activities.synced.map((day) => ({ start: day.date, values: day.families }))}
            />
          </CardContent>
        </Card>
        <Card className="order-4 lg:order-none">
          <CardHeader>
            <CardTitle>{t("notifications.title")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 items-center">
            <DonutChart
              label={t("notifications.chart")}
              totalLabel={t("notifications.total")}
              emptyLabel={t("notifications.empty")}
              segments={[
                { id: "unread", label: t("notifications.unread"), value: notifications.unread, color: "blue" },
                { id: "read", label: t("notifications.read"), value: notifications.read, color: "muted" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("stravaUsage.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <StravaUsageChart
            days={stravaUsage.days}
            quarters={stravaUsage.quarters}
            labels={{
              days: t("stravaUsage.days", { days }),
              quarters: t("stravaUsage.quarters"),
              period: t("stravaUsage.period"),
              read: t("stravaUsage.read"),
              dailyLimit: t("stravaUsage.dailyLimit"),
              shortLimit: t("stravaUsage.shortLimit"),
              dailyLimitCaption: t("stravaUsage.limitCaption", {
                limit: t("stravaUsage.dailyLimit"),
                value: format.number(latestLimit(stravaUsage.days)),
              }),
              shortLimitCaption: t("stravaUsage.limitCaption", {
                limit: t("stravaUsage.shortLimit"),
                value: format.number(latestLimit(stravaUsage.quarters)),
              }),
              overall: t("stravaUsage.overall"),
              chart: t("stravaUsage.chart"),
              empty: t("stravaUsage.empty"),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}

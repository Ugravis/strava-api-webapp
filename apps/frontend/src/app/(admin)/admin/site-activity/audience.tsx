import { ADMIN_DORMANCY_BUCKETS } from "@kilotrace/shared/admin";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { BarList, CardFigure, ChartHead } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

const HEIGHT = 220;

/** Who uses the site: active users, new or back, week after week, by segment and country. */
export async function AudienceTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.audience");
  const [format, users] = await Promise.all([getSiteActivityFormat(), siteActivity("users", view.days, view.team, view.admin)]);
  if (!users) return <DashboardUnavailable />;

  const days = users.dates.map(format.day);
  const longDays = users.dates.map(format.longDay);
  const active = [
    { id: "dau", label: t("active.dau"), color: "blue" as const },
    { id: "wau", label: t("active.wau"), color: "aqua" as const },
    { id: "mau", label: t("active.mau"), color: "orange" as const },
  ];
  const latest = users.activeUsers.at(-1);
  const stickiness = users.activeUsers.map((day) => (day.mau > 0 ? day.dau / day.mau : null));
  const known = stickiness.filter((value): value is number => value !== null);
  const newVsReturning = [
    { id: "returning", label: t("newVsReturning.returning"), color: "blue" as const },
    { id: "new", label: t("newVsReturning.new"), color: "aqua" as const },
  ];
  const weekly = [
    { id: "retained", label: t("weekly.retained"), color: "blue" as const },
    { id: "resurrected", label: t("weekly.resurrected"), color: "yellow" as const },
    { id: "new", label: t("weekly.new"), color: "aqua" as const },
  ];
  const latestWeek = users.weekly.at(-1);
  const dormant = users.dormancy.reduce((sum, bucket) => sum + bucket.users, 0);
  const segmentNames = getAdminTranslations("siteActivity.audience.segments.names");

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("active.title")} description={t("active.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                latest && (
                  <>
                    <CardFigure value={format.number(latest.dau)} label={t("active.today")} />
                    <CardFigure value={format.number(latest.wau)} label={t("active.week")} />
                    <CardFigure value={format.number(latest.mau)} label={t("active.month")} />
                  </>
                )
              }
              legend={<ChartLegend items={active} label={t("legend")} />}
            />
            <LineChart
              labels={days}
              titles={longDays}
              series={active}
              label={t("active.title")}
              height={HEIGHT}
              values={{ dau: users.activeUsers.map((day) => day.dau), wau: users.activeUsers.map((day) => day.wau), mau: users.activeUsers.map((day) => day.mau) }}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("stickiness.title")} description={t("stickiness.description")}>
          <div className="flex h-full flex-col justify-between gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.percent(known.length ? known.reduce((sum, value) => sum + value, 0) / known.length : null)} label={t("stickiness.average")} />
                  <CardFigure value={format.percent(known.length ? Math.max(...known) : null)} label={t("stickiness.best")} />
                </>
              }
            />
            <LineChart
              labels={days}
              titles={longDays}
              percent
              series={[{ id: "stickiness", label: t("stickiness.series"), color: "blue" }]}
              values={{ stickiness }}
              label={t("stickiness.title")}
              height={HEIGHT - 40}
            />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("newVsReturning.title")} description={t("newVsReturning.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(users.newVsReturning.reduce((sum, day) => sum + day.returning, 0))} label={t("newVsReturning.returningDays")} />
                  <CardFigure value={format.number(users.newVsReturning.reduce((sum, day) => sum + day.new, 0))} label={t("newVsReturning.newDays")} />
                </>
              }
              legend={<ChartLegend items={newVsReturning} label={t("legend")} />}
            />
            <TimeSeriesChart
              unit="day"
              height={HEIGHT}
              label={t("newVsReturning.title")}
              totalLabel={t("newVsReturning.total")}
              series={newVsReturning}
              points={users.newVsReturning.map((day) => ({ start: day.date, values: { returning: day.returning, new: day.new } }))}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("dormancy.title")} description={t("dormancy.description")}>
          <BarList
            empty={t("empty")}
            color="aqua"
            max={dormant || 1}
            items={ADMIN_DORMANCY_BUCKETS.map((bucket) => {
              const count = users.dormancy.find((entry) => entry.bucket === bucket)?.users ?? 0;
              return {
                key: bucket,
                label: t(`dormancy.buckets.${bucket}`),
                value: count,
                figure: `${format.number(count)} · ${format.percent(format.ratio(count, dormant), 0)}`,
              };
            })}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("weekly.title")} description={t("weekly.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                latestWeek && (
                  <>
                    <CardFigure value={format.number(latestWeek.active)} label={t("weekly.thisWeek")} />
                    <CardFigure value={format.number(latestWeek.churned)} label={t("weekly.churnedThisWeek")} />
                  </>
                )
              }
              legend={<ChartLegend items={weekly} label={t("legend")} />}
            />
            <BarChart
              labels={users.weekly.map((week) => format.day(week.week))}
              titles={users.weekly.map((week) => t("weekly.week", { date: format.day(week.week) }))}
              series={weekly}
              values={{
                retained: users.weekly.map((week) => week.retained),
                resurrected: users.weekly.map((week) => week.resurrected),
                new: users.weekly.map((week) => week.new),
              }}
              totalLabel={t("weekly.total")}
              notes={[{ label: t("weekly.churned"), values: users.weekly.map((week) => format.number(week.churned)) }]}
              label={t("weekly.title")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("monthly.title")} description={t("monthly.description")}>
          <BarChart
            labels={users.monthly.map((month) => format.month(month.month))}
            titles={users.monthly.map((month) => format.longMonth(month.month))}
            series={[{ id: "users", label: t("monthly.users"), color: "blue" }]}
            values={{ users: users.monthly.map((month) => month.users) }}
            notes={[{ label: t("monthly.averageDays"), values: users.monthly.map((month) => format.number(month.averageDays, 1)) }]}
            label={t("monthly.title")}
            height={HEIGHT + 40}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("segments.title")} description={t("segments.description")} className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("segments.segment")}</TableHead>
                <TableHead className="text-right">{t("segments.total")}</TableHead>
                <TableHead className="text-right">{t("segments.active")}</TableHead>
                <TableHead className="w-2/5">{t("segments.rate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.segments.map((segment) => {
                const rate = format.ratio(segment.active, segment.total);
                return (
                  <TableRow key={segment.segment}>
                    <TableCell className="font-medium">{segmentNames(segment.segment)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.number(segment.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.number(segment.active)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(rate ?? 0) * 100}%` }} />
                        </span>
                        <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{format.percent(rate, 0)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DashboardCard>
        <DashboardCard title={t("countries.title")} description={t("countries.description")}>
          <BarList
            empty={t("empty")}
            maxHeight={300}
            items={users.countries.map((country) => ({
              key: country.country ?? "none",
              label: country.country ? regionName(country.country) : t("countries.none"),
              value: country.total,
              figure: t("countries.figure", { total: format.number(country.total), active: country.active }),
            }))}
          />
        </DashboardCard>
      </div>
    </>
  );
}

const regions = new Intl.DisplayNames(["fr"], { type: "region" });

/** Name of a country from its ISO code, the code itself when unknown. */
function regionName(code: string) {
  try {
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

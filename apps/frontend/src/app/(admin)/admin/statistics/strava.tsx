import { KpiStrip, KpiStripFigure } from "@/components/admin/kpi-tile";
import type { AdminStravaUsagePoint } from "@kilotrace/shared/admin";
import { getBusinessFormat } from "@/components/admin/business-statistics/business-format";
import { ScalableBarChart } from "@/components/admin/business-statistics/scalable-bar-chart";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { BarList, CardFigure, ChartHead } from "@/components/admin/site-activity/parts";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { StravaUsageChart } from "@/components/admin/statistics/strava-usage-chart";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { type BusinessView, businessStatistics } from "./data";

const HEIGHT = 200;

/** Error codes of the failed synchronizations named in plain words; the other Strava statuses share a label. */
const KNOWN_ERRORS = ["UNEXPECTED", "UNKNOWN", "STRAVA_401", "STRAVA_403", "STRAVA_404", "STRAVA_429"] as const;

/** The read limit of the latest slot with a Strava call. */
const latestLimit = (usage: AdminStravaUsagePoint[]) => usage.findLast((entry) => entry.readLimit !== null)?.readLimit ?? 0;

/** The link to Strava: accounts linked, what it brought, the health of the synchronization, the quota. */
export async function StravaTab({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.strava");
  const [format, data] = await Promise.all([getBusinessFormat(), businessStatistics("strava", view.period, view.team)]);
  if (!data) return <DashboardUnavailable />;

  const labels = data.buckets.map((bucket) => format.bucket(data.unit, bucket));
  const titles = data.buckets.map((bucket) => format.bucketTitle(data.unit, bucket));
  const { connections, jobs, webhooks, usage } = data;
  const seconds = (value: number | null) => format.duration(value === null ? null : value * 1000);
  const jobSeries = [
    { id: "completed", label: t("jobs.completed"), color: "blue" as const },
    { id: "failed", label: t("jobs.failed"), color: "orange" as const },
  ];
  const webhookSeries = [
    { id: "create", label: t("webhooks.create"), color: "blue" as const },
    { id: "update", label: t("webhooks.update"), color: "aqua" as const },
    { id: "delete", label: t("webhooks.delete"), color: "orange" as const },
  ];
  const errorLabel = (code: string) => {
    if (KNOWN_ERRORS.includes(code as (typeof KNOWN_ERRORS)[number])) return t(`jobs.codes.${code as (typeof KNOWN_ERRORS)[number]}`);
    const status = /^STRAVA_(\d{3})$/.exec(code)?.[1];
    return status ? t("jobs.codes.strava", { status }) : t("jobs.codes.other", { code });
  };
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const activities = data.imports.map((point) => point.activities);
  const links = data.imports.map((point) => point.connections);
  const reads = usage.days.flatMap((day) => (day.read !== null ? [day.read] : []));
  const peak = reads.length > 0 ? Math.max(...reads) : null;
  const limit = latestLimit(usage.days);
  const today = usage.days.at(-1);

  return (
    <>
      <KpiStrip>
        <KpiStripFigure label={t("strip.connected")} value={format.number(connections.connected)} detail={t("strip.connectedDetail", { share: format.percent(format.ratio(connections.connected, connections.accounts), 0) })} />
        <KpiStripFigure label={t("strip.fresh")} value={format.number(connections.fresh)} detail={t("strip.freshDetail")} />
        <KpiStripFigure label={t("strip.neverSynced")} value={format.number(connections.neverSynced)} detail={t("strip.neverSyncedDetail")} />
        <KpiStripFigure label={t("strip.privateScope")} value={format.percent(format.ratio(connections.privateScope, connections.connected), 0)} detail={t("strip.privateScopeDetail")} />
        <KpiStripFigure label={t("strip.quota")} value={today?.read != null && today.readLimit ? format.percent(today.read / today.readLimit, 0) : "–"} detail={t("strip.quotaDetail", { peak: peak === null ? "–" : format.number(peak), limit: format.number(limit) })} />
      </KpiStrip>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("imports.title")} description={t("imports.description")} className="lg:col-span-2">
          <ScalableBarChart
            figures={<CardFigure value={format.number(sum(activities))} label={t("imports.total")} />}
            switchLabel={t("imports.log")}
            labels={labels}
            titles={titles}
            series={[{ id: "activities", label: t("imports.series"), color: "blue" }]}
            values={{ activities }}
            label={t("imports.title")}
            height={HEIGHT}
          />
        </DashboardCard>
        <DashboardCard title={t("links.title")} description={t("links.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead figures={<CardFigure value={format.number(sum(links))} label={t("links.total")} />} />
            <BarChart labels={labels} titles={titles} series={[{ id: "connections", label: t("links.series"), color: "aqua" }]} values={{ connections: links }} label={t("links.title")} height={HEIGHT} />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title={t("jobs.title")} description={t("jobs.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.percent(format.ratio(jobs.completed, jobs.completed + jobs.failed), 0)} label={t("jobs.successRate")} />
                  <CardFigure value={seconds(jobs.medianDurationS)} label={t("jobs.medianDuration")} />
                  <CardFigure value={format.number(jobs.active)} label={t("jobs.active")} />
                </>
              }
              legend={<ChartLegend items={jobSeries} label={t("legend")} />}
            />
            <BarChart
              labels={labels}
              titles={titles}
              series={jobSeries}
              values={{ completed: jobs.series.map((point) => point.completed), failed: jobs.series.map((point) => point.failed) }}
              label={t("jobs.title")}
              totalLabel={t("total")}
              height={HEIGHT}
            />
            {jobs.errors.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t pt-4">
                <span className="text-xs font-medium text-muted-foreground">{t("jobs.errors")}</span>
                <BarList
                  color="orange"
                  empty=""
                  max={jobs.failed}
                  items={jobs.errors.map(({ code, count }) => ({
                    key: code,
                    label: <span title={code}>{errorLabel(code)}</span>,
                    value: count,
                    figure: t("jobs.errorFigure", { count, share: format.percent(format.ratio(count, jobs.failed), 0) }),
                  }))}
                />
              </div>
            )}
          </div>
        </DashboardCard>
        <DashboardCard title={t("webhooks.title")} description={t("webhooks.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(webhooks.received)} label={t("webhooks.received")} />
                  <CardFigure value={seconds(webhooks.medianDelayS)} label={t("webhooks.medianDelay")} />
                  <CardFigure value={format.number(webhooks.pending)} label={t("webhooks.pending")} />
                  <CardFigure value={format.number(webhooks.failing)} label={t("webhooks.failing")} />
                </>
              }
              legend={<ChartLegend items={webhookSeries} label={t("legend")} />}
            />
            <BarChart
              labels={labels}
              titles={titles}
              series={webhookSeries}
              values={{
                create: webhooks.series.map((point) => point.create),
                update: webhooks.series.map((point) => point.update),
                delete: webhooks.series.map((point) => point.delete),
              }}
              label={t("webhooks.title")}
              totalLabel={t("total")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t("usage.title")} description={t("usage.description")}>
        <StravaUsageChart
          days={usage.days}
          quarters={usage.quarters}
          labels={{
            days: t("usage.days"),
            quarters: t("usage.quarters"),
            period: t("usage.period"),
            read: t("usage.read"),
            dailyLimit: t("usage.dailyLimit"),
            shortLimit: t("usage.shortLimit"),
            dailyLimitCaption: t("usage.limitCaption", { limit: t("usage.dailyLimit"), value: format.number(limit) }),
            shortLimitCaption: t("usage.limitCaption", { limit: t("usage.shortLimit"), value: format.number(latestLimit(usage.quarters)) }),
            overall: t("usage.overall"),
            chart: t("usage.chart"),
            empty: t("usage.empty"),
          }}
        />
      </DashboardCard>
    </>
  );
}

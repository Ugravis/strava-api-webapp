import { ADMIN_DURATION_BUCKETS, type AdminSiteActivityPages } from "@kilotrace/shared/admin";
import { PAGE_VIEW_DEVICES } from "@kilotrace/shared";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { WeekHeatmap } from "@/components/admin/site-activity/heatmap";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { CardFigure, ChartHead, THIN_SCROLL } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { DonutChart } from "@/components/admin/statistics/donut-chart";
import { SERIES_COLORS, type SeriesColorName } from "@/components/admin/statistics/palette";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@kilotrace/ui/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

const HEIGHT = 220;

/** Kinds of device, in a fixed color each. */
const DEVICE_COLORS = { desktop: "blue", mobile: "aqua", tablet: "yellow" } as const satisfies Record<AdminSiteActivityPages["devices"][number]["device"], SeriesColorName>;

/** The five trends in the fixed order of the palette, the last kept in the background. */
const TREND_COLORS: SeriesColorName[] = ["blue", "aqua", "orange", "yellow", "muted"];

const AREA_COLORS = { app: "blue", admin: "orange" } as const satisfies Record<"app" | "admin", SeriesColorName>;

/** What is viewed: pages, their time, the hours, the devices and the areas of the site. */
export async function PagesTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.pages");
  const [format, pages] = await Promise.all([getSiteActivityFormat(), siteActivity("pages", view.days, view.team, view.admin)]);
  if (!pages) return <DashboardUnavailable />;

  const days = pages.dates.map(format.day);
  const longDays = pages.dates.map(format.longDay);
  const views = pages.daily.reduce((sum, day) => sum + day.views, 0);
  const visibleMs = pages.daily.reduce((sum, day) => sum + day.visibleMs, 0);
  const busiest = pages.daily.reduce<(typeof pages.daily)[number] | null>((best, day) => (best === null || day.views > best.views ? day : best), null);
  const trends = pages.trends.map((trend, index) => ({ id: trend.path, label: trend.path, color: TREND_COLORS[index] ?? "muted" }));
  const deviceName = getAdminTranslations("siteActivity.pages.devices.names");
  const devices = PAGE_VIEW_DEVICES.map((device) => ({ id: device, label: deviceName(device), color: DEVICE_COLORS[device] }));
  const weekdays = getAdminTranslations("siteActivity.pages.heatmap.days");
  const peak = pages.heatmap.reduce<(typeof pages.heatmap)[number] | null>((best, cell) => (best === null || cell.views > best.views ? cell : best), null);
  const areaTotal = pages.areas.reduce((sum, area) => sum + area.views, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("daily.title")} description={t("daily.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(views)} label={t("daily.views")} />
                  <CardFigure value={format.number(views / Math.max(pages.dates.length, 1), 1)} label={t("daily.perDay")} />
                  {busiest && busiest.views > 0 && <CardFigure value={format.day(busiest.date)} label={t("daily.busiest", { views: busiest.views })} />}
                </>
              }
            />
            <TimeSeriesChart
              unit="day"
              height={HEIGHT}
              label={t("daily.title")}
              series={[{ id: "views", label: t("daily.views"), color: "blue" }]}
              points={pages.daily.map((day) => ({ start: day.date, values: { views: day.views } }))}
              notes={[{ label: t("daily.viewers"), values: pages.daily.map((day) => day.viewers) }]}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("visible.title")} description={t("visible.description")}>
          <div className="flex h-full flex-col justify-between gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.duration(visibleMs)} label={t("visible.total")} />
                  <CardFigure value={format.duration(views > 0 ? visibleMs / views : null)} label={t("visible.perView")} />
                </>
              }
            />
            <BarChart
              labels={days}
              titles={longDays}
              series={[{ id: "minutes", label: t("visible.series"), color: "yellow" }]}
              values={{ minutes: pages.daily.map((day) => Math.round(day.visibleMs / 60_000)) }}
              notes={[{ label: t("visible.perViewer"), values: pages.daily.map((day) => format.duration(day.viewers > 0 ? day.visibleMs / day.viewers : null)) }]}
              label={t("visible.title")}
              height={HEIGHT - 40}
            />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t("ranking.title")} description={t("ranking.description", { count: pages.pages.length })}>
        {pages.pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className={cn("-mx-2 max-h-112 overflow-x-auto px-2", THIN_SCROLL)}>
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-medium">{t("ranking.path")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("ranking.views")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("ranking.users")}</th>
                  <th className="w-44 py-2 pr-3 text-left font-medium">{t("ranking.reach")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("ranking.total")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("ranking.average")}</th>
                  <th className="py-2 text-right font-medium">{t("ranking.median")}</th>
                </tr>
              </thead>
              <tbody>
                {pages.pages.map((page, index) => {
                  const reach = format.ratio(page.users, pages.activeUsers);
                  return (
                    <tr key={page.path} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="max-w-80 py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                          <code className="truncate font-mono text-xs">{page.path}</code>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium tabular-nums">{format.number(page.views)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{format.number(page.users)}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                            <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(reach ?? 0) * 100}%` }} />
                          </span>
                          <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">{format.percent(reach, 0)}</span>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{format.duration(page.totalMs)}</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">{format.duration(page.averageMs)}</td>
                      <td className="py-2 text-right whitespace-nowrap text-muted-foreground tabular-nums">{format.duration(page.medianMs)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("trends.title")} description={t("trends.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead legend={<ChartLegend items={trends} label={t("legend")} />} />
            <LineChart
              labels={days}
              titles={longDays}
              series={trends}
              values={Object.fromEntries(pages.trends.map((trend) => [trend.path, trend.values]))}
              label={t("trends.title")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("durations.title")} description={t("durations.description")}>
          <BarChart
            labels={ADMIN_DURATION_BUCKETS.map((bucket) => bucket)}
            series={[{ id: "views", label: t("daily.views"), color: "aqua" }]}
            values={{ views: ADMIN_DURATION_BUCKETS.map((bucket) => pages.durations.find((entry) => entry.bucket === bucket)?.views ?? 0) }}
            shareLabel={getAdminTranslations("siteActivity")("share")}
            label={t("durations.title")}
            height={HEIGHT + 40}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("heatmap.title")} description={t("heatmap.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {peak && peak.views > 0 && (
              <ChartHead
                figures={<CardFigure value={t("heatmap.peakValue", { day: weekdays(String(peak.weekday) as "1"), hour: peak.hour })} label={t("heatmap.peak", { views: peak.views })} />}
              />
            )}
            <WeekHeatmap
              cells={pages.heatmap}
              days={["1", "2", "3", "4", "5", "6", "7"].map((day) => weekdays(day as "1"))}
              label={t("heatmap.title")}
              legend={{ less: t("heatmap.less"), more: t("heatmap.more") }}
              title={(cell) => t("heatmap.cell", { day: weekdays(String(cell.weekday) as "1"), hour: cell.hour, views: cell.views })}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("areas.title")} description={t("areas.description")}>
          <div className="flex flex-col gap-4">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              {pages.areas.map((area) => (
                <span
                  key={area.area}
                  className={cn("h-full", SERIES_COLORS[AREA_COLORS[area.area]].swatch)}
                  style={{ width: `${(format.ratio(area.views, areaTotal) ?? 0) * 100}%` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {(["app", "admin"] as const).map((key) => {
                const area = pages.areas.find((entry) => entry.area === key) ?? { area: key, views: 0, users: 0, visibleMs: 0 };
                return (
                  <div key={key} className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3.5 py-3">
                    <ChartLegend items={[{ id: key, label: t(`areas.${key}`), color: AREA_COLORS[key] }]} label={t(`areas.${key}`)} />
                    <span className="text-lg font-semibold tracking-tight tabular-nums">
                      {format.number(area.views)} <span className="text-xs font-normal text-muted-foreground">· {format.percent(format.ratio(area.views, areaTotal), 0)}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{t("areas.figure", { users: area.users, time: format.duration(area.visibleMs) })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        <DashboardCard title={t("devicesDaily.title")} description={t("devicesDaily.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead legend={<ChartLegend items={devices} label={t("legend")} />} />
            <TimeSeriesChart
              unit="day"
              height={HEIGHT}
              label={t("devicesDaily.title")}
              totalLabel={t("daily.views")}
              series={devices}
              points={pages.devicesDaily.map((day) => ({ start: day.date, values: { desktop: day.desktop, mobile: day.mobile, tablet: day.tablet } }))}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("devices.title")} description={t("devices.description")}>
          <DonutChart
            label={t("devices.title")}
            totalLabel={t("daily.views")}
            emptyLabel={t("empty")}
            divided
            segments={devices.map((device) => ({ ...device, value: pages.devices.find((entry) => entry.device === device.id)?.views ?? 0 }))}
          />
        </DashboardCard>
        <DashboardCard title={t("devicesDetail.title")} description={t("devicesDetail.description")}>
          <ul className="flex flex-col divide-y">
            {devices.map((device) => {
              const entry = pages.devices.find((item) => item.device === device.id);
              return (
                <li key={device.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-xs", SERIES_COLORS[device.color].swatch)} aria-hidden />
                    {device.label}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("devicesDetail.figure", { users: entry?.users ?? 0, time: format.duration(entry?.visibleMs ?? 0) })}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("multiDevice.title")}</span>
            <BarChart
              labels={pages.multiDevice.map((bin) => format.number(bin.value))}
              titles={pages.multiDevice.map((bin) => t("multiDevice.bin", { count: bin.value }))}
              series={[{ id: "users", label: t("multiDevice.users"), color: "blue" }]}
              values={{ users: pages.multiDevice.map((bin) => bin.count) }}
              shareLabel={getAdminTranslations("siteActivity")("share")}
              label={t("multiDevice.title")}
              height={120}
            />
          </div>
        </DashboardCard>
      </div>
    </>
  );
}

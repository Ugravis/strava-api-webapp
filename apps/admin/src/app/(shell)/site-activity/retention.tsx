import type { AdminHistogramBin, AdminRetention } from "@kilotrace/shared/admin";
import { Fragment } from "react";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { MonthHistogram } from "@/components/admin/site-activity/month-histogram";
import { CardFigure, ChartHead, RateCell, THIN_SCROLL } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat, type SiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@kilotrace/ui/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

const HEIGHT = 220;

/** A card content pushed to the bottom, so that the charts of a row share their axis. */
const BOTTOM = "flex h-full flex-col justify-end gap-4";

/** Active days from which a user counts as regular, in the figure of the card « at least ». */
const REGULAR_DAYS = 4;

/** Retention of every cohort together: their retained over their eligible. */
const pooled = (rates: AdminRetention[]): AdminRetention =>
  rates.reduce((sum, rate) => ({ retained: sum.retained + rate.retained, eligible: sum.eligible + rate.eligible }), { retained: 0, eligible: 0 });

/** Users per whole number, as bars. */
function Histogram({ bins, label, unit, series, color = "blue", format, height = HEIGHT }: {
  bins: AdminHistogramBin[];
  label: string;
  /** Title of a bar, from its value. */
  unit: (value: number) => string;
  series: string;
  color?: SeriesColorName;
  format: SiteActivityFormat;
  height?: number;
}) {
  return (
    <BarChart
      labels={bins.map((bin) => format.number(bin.value))}
      titles={bins.map((bin) => unit(bin.value))}
      series={[{ id: "count", label: series, color }]}
      values={{ count: bins.map((bin) => bin.count) }}
      shareLabel={getAdminTranslations("siteActivity")("share")}
      label={label}
      height={height}
    />
  );
}

/** Whether users come back: cohorts, curve, active days and streaks. */
export async function RetentionTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.retention");
  const [format, users] = await Promise.all([getSiteActivityFormat(), siteActivity("users", view.days, view.team, view.admin)]);
  if (!users) return <DashboardUnavailable />;
  // Users active on at least each number of days: the distribution summed from its end.
  const activeOn = (days: number) => users.activeDaysInPeriod.reduce((sum, bin) => sum + (bin.value >= days ? bin.count : 0), 0);
  const activeInPeriod = activeOn(1);
  const atLeast = users.activeDaysInPeriod.filter((bin) => bin.value > 0).map((bin) => ({ value: bin.value, count: activeOn(bin.value) }));

  const curve = [
    { id: "rolling", label: t("curve.rolling"), color: "aqua" as const },
    { id: "classic", label: t("curve.classic"), color: "blue" as const },
  ];
  const milestones = [
    { key: "d1", label: t("cohorts.d1"), rate: pooled(users.retention.map((cohort) => cohort.d1)) },
    { key: "d7", label: t("cohorts.d7"), rate: pooled(users.retention.map((cohort) => cohort.d7)) },
    { key: "d30", label: t("cohorts.d30"), rate: pooled(users.retention.map((cohort) => cohort.d30)) },
  ];
  const weeks = Math.max(0, ...users.retention.map((cohort) => cohort.weeks.length));
  const cell = (rate: AdminRetention, className?: string) => {
    const ratio = format.rate(rate);
    return (
      <RateCell ratio={ratio} className={className} title={rate.eligible > 0 ? t("cohorts.cell", { retained: rate.retained, eligible: rate.eligible }) : t("cohorts.notYet")}>
        {ratio === null ? "–" : format.percent(ratio, 0)}
      </RateCell>
    );
  };
  const days = (value: number) => t("days", { count: value });

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("curve.title")} description={t("curve.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead legend={<ChartLegend items={curve} label={t("legend")} />} />
            <LineChart
              labels={users.retentionCurve.map((point) => t("dayShort", { day: point.day }))}
              titles={users.retentionCurve.map((point) => t("dayLong", { day: point.day }))}
              percent
              series={curve}
              values={{
                rolling: users.retentionCurve.map((point) => format.rate(point.rolling)),
                classic: users.retentionCurve.map((point) => format.rate(point.classic)),
              }}
              label={t("curve.title")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("milestones.title")} description={t("milestones.description")}>
          <ul className="flex flex-col divide-y">
            {milestones.map((milestone) => {
              const ratio = format.rate(milestone.rate);
              return (
                <li key={milestone.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{milestone.label}</span>
                    <span className="text-xl font-semibold tracking-tight tabular-nums">{format.percent(ratio, 0)}</span>
                  </div>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(ratio ?? 0) * 100}%` }} />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("milestones.figure", { retained: format.number(milestone.rate.retained), eligible: format.number(milestone.rate.eligible) })}
                  </span>
                </li>
              );
            })}
          </ul>
        </DashboardCard>
      </div>

      <DashboardCard title={t("cohorts.title")} description={t("cohorts.description")}>
        {users.retention.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("cohorts.empty")}</p>
        ) : (
          <div className={cn("-mx-2 max-h-120 overflow-x-auto px-2", THIN_SCROLL)}>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="text-xs text-muted-foreground">
                  <th className="py-2 pr-3 text-left font-medium">{t("cohorts.week")}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t("cohorts.size")}</th>
                  {milestones.map((milestone) => (
                    <th key={milestone.key} className="px-0.5 py-2 font-medium">
                      {milestone.label}
                    </th>
                  ))}
                  {Array.from({ length: weeks }, (_, index) => (
                    <th key={index} className={cn("px-0.5 py-2 font-medium", index === 0 && "border-l pl-2")}>
                      {t("cohorts.weekShort", { week: index + 1 })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...users.retention].reverse().map((cohort) => (
                  <tr key={cohort.week}>
                    <td className="py-0.5 pr-3 whitespace-nowrap">{format.day(cohort.week)}</td>
                    <td className="py-0.5 pr-3 text-right text-muted-foreground tabular-nums">{format.number(cohort.size)}</td>
                    {cell(cohort.d1)}
                    {cell(cohort.d7)}
                    {cell(cohort.d30)}
                    {Array.from({ length: weeks }, (_, index) => (
                      <Fragment key={index}>{cell(cohort.weeks[index] ?? { retained: 0, eligible: 0 }, cn(index === 0 && "border-l pl-1.5"))}</Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>

      {/* The four charts of the active days in one grid, of one size, their axes on one line per row. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title={t("activeDaysInPeriod.title")} description={t("activeDaysInPeriod.description", { days: view.days })}>
          <div className={BOTTOM}>
            <ChartHead
              figures={
                <CardFigure
                  value={format.number(
                    users.activeDaysInPeriod.reduce((sum, bin) => sum + bin.value * bin.count, 0) / Math.max(users.activeDaysInPeriod.reduce((sum, bin) => sum + bin.count, 0), 1),
                    1,
                  )}
                  label={t("activeDaysInPeriod.average")}
                />
              }
            />
            <Histogram bins={users.activeDaysInPeriod} label={t("activeDaysInPeriod.title")} unit={days} series={t("users")} format={format} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("streaks.title")} description={t("streaks.description")}>
          <div className={BOTTOM}>
            <ChartHead
              figures={<CardFigure value={days(Math.max(0, ...users.streaks.filter((bin) => bin.count > 0).map((bin) => bin.value)))} label={t("streaks.longest")} />}
            />
            <Histogram bins={users.streaks} label={t("streaks.title")} unit={days} series={t("users")} color="orange" format={format} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("activeDays.title")} description={t("activeDays.description")}>
          <div className={BOTTOM}>
            <MonthHistogram
              months={users.activeDays.map((month) => ({
                key: month.month,
                label: format.longMonth(month.month),
                labels: month.distribution.map((bin) => format.number(bin.value)),
                titles: month.distribution.map((bin) => days(bin.value)),
                counts: month.distribution.map((bin) => bin.count),
              }))}
              series={t("users")}
              shareLabel={getAdminTranslations("siteActivity")("share")}
              label={t("activeDays.title")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("atLeast.title")} description={t("atLeast.description", { days: view.days })}>
          <div className={BOTTOM}>
            <ChartHead
              figures={<CardFigure value={format.percent(format.ratio(activeOn(REGULAR_DAYS), activeInPeriod), 0)} label={t("atLeast.regular", { count: REGULAR_DAYS })} />}
            />
            <BarChart
              labels={atLeast.map((bin) => format.number(bin.value))}
              titles={atLeast.map((bin) => t("atLeast.bin", { count: bin.value }))}
              series={[{ id: "count", label: t("users"), color: "aqua" }]}
              values={{ count: atLeast.map((bin) => bin.count) }}
              notes={[{ label: t("atLeast.share"), values: atLeast.map((bin) => format.percent(format.ratio(bin.count, activeInPeriod), 0)) }]}
              label={t("atLeast.title")}
              height={HEIGHT}
            />
          </div>
        </DashboardCard>
      </div>
    </>
  );
}

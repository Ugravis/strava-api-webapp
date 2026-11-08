import { ADMIN_SPORT_FAMILIES, type AdminSportFamily } from "@kilotrace/shared/admin";
import { getBusinessFormat } from "@/components/admin/business-statistics/business-format";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { WeekHeatmap } from "@/components/admin/site-activity/heatmap";
import { BarList, CardFigure, ChartHead } from "@/components/admin/site-activity/parts";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { DonutChart } from "@/components/admin/statistics/donut-chart";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@kilotrace/ui/components/ui/table";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { type BusinessView, businessStatistics } from "./data";

const HEIGHT = 220;

/** Families with the colors of the dashboard. */
const FAMILY_COLORS: Record<AdminSportFamily, SeriesColorName> = { ride: "blue", run: "orange", hike: "aqua", swim: "yellow", other: "muted" };

/** What the athletes practice, how much, when: by the dates of the activities. */
export async function SportsTab({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.sports");
  const families = getAdminTranslations("businessStatistics.families");
  const [format, data] = await Promise.all([getBusinessFormat(), businessStatistics("sports", view.period, view.team)]);
  if (!data) return <DashboardUnavailable />;

  const labels = data.buckets.map((bucket) => format.bucket(data.unit, bucket));
  const titles = data.buckets.map((bucket) => format.bucketTitle(data.unit, bucket));
  const series = ADMIN_SPORT_FAMILIES.map((family) => ({ id: family, label: families(family), color: FAMILY_COLORS[family] }));
  const perFamily = (points: Record<AdminSportFamily, number>[], scale = 1) =>
    Object.fromEntries(ADMIN_SPORT_FAMILIES.map((family) => [family, points.map((point) => point[family] / scale)]));
  const { totals, kinds } = data;
  const peakAthletes = Math.max(0, ...data.athletes);
  const days = [1, 2, 3, 4, 5, 6, 7].map((day) => t(`week.days.${day as 1}`));

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("activities.title")} description={t("activities.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(totals.activities)} label={t("activities.total")} />
                  <CardFigure value={totals.activities > 0 ? format.duration((totals.movingS / totals.activities) * 1000) : "–"} label={t("activities.average")} />
                </>
              }
              legend={<ChartLegend items={series} label={t("legend")} />}
            />
            <BarChart labels={labels} titles={titles} series={series} values={perFamily(data.activities)} label={t("activities.title")} totalLabel={t("total")} height={HEIGHT} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("kinds.title")} description={t("kinds.description")}>
          <DonutChart
            label={t("kinds.title")}
            totalLabel={t("kinds.total")}
            emptyLabel={t("kinds.empty")}
            segments={[
              { id: "outdoor", label: t("kinds.outdoor"), value: kinds.outdoor, color: "blue" },
              { id: "indoor", label: t("kinds.indoor"), value: kinds.indoor, color: "orange" },
              { id: "manual", label: t("kinds.manual"), value: kinds.manual, color: "muted" },
            ]}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("distance.title")} description={t("distance.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.km(totals.distanceM)} label={t("distance.total")} />
                  <CardFigure value={totals.medianDistanceM === null ? "–" : format.km(totals.medianDistanceM)} label={t("distance.median")} />
                  <CardFigure value={format.meters(totals.elevationM)} label={t("distance.elevation")} />
                </>
              }
              legend={<ChartLegend items={series} label={t("legend")} />}
            />
            <BarChart labels={labels} titles={titles} series={series} values={perFamily(data.distanceM, 1000)} label={t("distance.title")} totalLabel={t("total")} height={HEIGHT} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("athletes.title")} description={t("athletes.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(totals.athletes)} label={t("athletes.total")} />
                  <CardFigure value={format.number(peakAthletes)} label={t("athletes.peak")} />
                </>
              }
            />
            <BarList
              color="aqua"
              empty={t("table.empty")}
              max={totals.athletes}
              items={data.load.map(({ bucket, count }) => ({
                key: bucket,
                label: t("athletes.bucket", { range: bucket }),
                value: count,
                figure: format.number(count),
              }))}
            />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t("table.title")} description={t("table.description")}>
        {data.sports.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("table.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.sport")}</TableHead>
                  {(["activities", "share", "athletes", "distance", "time", "elevation", "averageDistance", "averageSpeed"] as const).map((column) => (
                    <TableHead key={column} className="text-right">
                      {t(`table.${column}`)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sports.map((sport) => (
                  <TableRow key={sport.sport}>
                    <TableCell className="font-medium">{format.sport(sport.sport)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.number(sport.activities)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.percent(format.ratio(sport.activities, totals.activities), 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.number(sport.athletes)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.km(sport.distanceM)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.hours(sport.movingS)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.meters(sport.elevationM)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format.km(sport.distanceM / sport.activities)}</TableCell>
                    <TableCell className="text-right tabular-nums">{sport.movingS > 0 && sport.distanceM > 0 ? `${format.number((sport.distanceM / sport.movingS) * 3.6, 1)} km/h` : "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("week.title")} description={t("week.description")} className="lg:col-span-2">
          <WeekHeatmap
            cells={data.week}
            days={days}
            label={t("week.title")}
            legend={{ less: t("week.less"), more: t("week.more") }}
            title={(cell) => t("week.cell", { day: days[cell.weekday - 1], hour: cell.hour, count: cell.views })}
          />
        </DashboardCard>
        <DashboardCard title={t("distances.title")} description={t("distances.description")}>
          <BarList
            empty={t("table.empty")}
            max={totals.activities}
            items={data.distances.map(({ bucket, count }) => ({
              key: bucket,
              label: t("distances.bucket", { range: bucket }),
              value: count,
              figure: `${format.number(count)} · ${format.percent(format.ratio(count, totals.activities), 0)}`,
            }))}
          />
        </DashboardCard>
      </div>
    </>
  );
}

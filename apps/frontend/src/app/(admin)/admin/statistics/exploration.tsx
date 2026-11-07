import { getBusinessFormat, regionName } from "@/components/admin/business-statistics/business-format";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { BarList, CardFigure, ChartHead, RateCell } from "@/components/admin/site-activity/parts";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { STRIP, StripFigure } from "../site-activity/kpis";
import { type BusinessView, businessStatistics } from "./data";

const HEIGHT = 220;

/** What the community explored as a whole, how it grows and where. */
export async function ExplorationTab({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.exploration");
  const [format, data] = await Promise.all([getBusinessFormat(), businessStatistics("exploration", view.period, view.team)]);
  if (!data) return <DashboardUnavailable />;

  const labels = data.buckets.map((bucket) => format.bucket(data.unit, bucket));
  const titles = data.buckets.map((bucket) => format.bucketTitle(data.unit, bucket));
  const { totals, medians } = data;
  const series = [
    { id: "individual", label: t("discoveries.individual"), color: "blue" as const },
    { id: "community", label: t("discoveries.community"), color: "orange" as const },
  ];
  const individual = data.discoveries.map((point) => point.individual);
  const community = data.discoveries.map((point) => point.community);
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const median = (value: number | null) => (value === null ? "–" : format.number(value));

  return (
    <>
      <Card className={cn("gap-0 overflow-hidden py-0", STRIP)}>
        <StripFigure label={t("totals.tiles")} value={format.number(totals.tiles)} detail={t("totals.explorers", { count: totals.explorers })} />
        <StripFigure label={t("totals.smallTiles")} value={format.number(totals.smallTiles)} detail={t("totals.smallTilesDetail")} />
        <StripFigure label={t("totals.countries")} value={format.number(totals.countries)} detail={t("totals.countriesDetail")} />
        <StripFigure
          label={t("totals.stations")}
          value={format.number(totals.stations)}
          detail={t("totals.imported", { value: format.number(totals.stationsImported), share: format.percent(format.ratio(totals.stations, totals.stationsImported)) })}
        />
        <StripFigure
          label={t("totals.railway")}
          value={format.km(totals.railwayM)}
          detail={t("totals.imported", { value: format.km(totals.railwayImportedM), share: format.percent(format.ratio(totals.railwayM, totals.railwayImportedM)) })}
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("discoveries.title")} description={t("discoveries.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(sum(individual))} label={t("discoveries.individualTotal")} />
                  <CardFigure value={format.number(sum(community))} label={t("discoveries.communityTotal")} />
                  <CardFigure value={format.number(sum(data.discoveries.map((point) => point.smallTiles)))} label={t("discoveries.smallTiles")} />
                </>
              }
              legend={<ChartLegend items={series} label={t("legend")} />}
            />
            <LineChart labels={labels} titles={titles} series={series} values={{ individual, community }} label={t("discoveries.title")} height={HEIGHT} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("explorers.title")} description={t("explorers.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={median(medians.tiles)} label={t("explorers.medianTiles")} />
                  <CardFigure value={median(medians.maxSquare)} label={t("explorers.medianSquare")} />
                  <CardFigure value={median(medians.maxCluster)} label={t("explorers.medianCluster")} />
                </>
              }
            />
            <BarList
              empty={t("countries.empty")}
              max={totals.explorers}
              items={data.explorers.map(({ bucket, count }) => ({
                key: bucket,
                label: t("explorers.bucket", { range: bucket }),
                value: count,
                figure: format.number(count),
              }))}
            />
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t("countries.title")} description={t("countries.description", { count: totals.countries })}>
        {data.countries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("countries.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("countries.country")}</TableHead>
                  <TableHead className="text-right">{t("countries.tiles")}</TableHead>
                  <TableHead className="text-right">{t("countries.total")}</TableHead>
                  <TableHead className="text-center">{t("countries.completion")}</TableHead>
                  <TableHead className="text-right">{t("countries.explorers")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.countries.map((country) => {
                  const ratio = country.totalTiles ? Math.min(country.tiles / country.totalTiles, 1) : null;
                  return (
                    <TableRow key={country.country}>
                      <TableCell className="font-medium">{regionName(country.country)}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(country.tiles)}</TableCell>
                      <TableCell className="text-right tabular-nums">{country.totalTiles ? format.number(country.totalTiles) : "–"}</TableCell>
                      <RateCell ratio={ratio}>{format.percent(ratio)}</RateCell>
                      <TableCell className="text-right tabular-nums">{format.number(country.explorers)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardCard>
    </>
  );
}

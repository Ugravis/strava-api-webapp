import type { AdminSiteActivityPages } from "@kilotrace/shared/admin";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { getAdminTranslations } from "@/lib/admin/messages";
import { PlainBarChart, PlainBarList, PlainHeatmap, PlainLineChart, PlainTable } from "./plain-charts";
import { Section, SectionGrid } from "./section";
import type { SiteActivityFormat } from "./site-activity-format";

const TREND_COLORS: SeriesColorName[] = ["blue", "orange", "aqua", "yellow", "muted"];
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function PagesTab({ data, format }: { data: AdminSiteActivityPages; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity");
  const labels = data.dates.map(format.day);
  const empty = <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  const hours = Array.from({ length: 24 }, (_, hour) => String(hour));
  const devices = [
    { id: "desktop", label: t("devices.desktop"), color: "blue" },
    { id: "mobile", label: t("devices.mobile"), color: "orange" },
    { id: "tablet", label: t("devices.tablet"), color: "aqua" },
  ] as const;

  return (
    <SectionGrid>
      <Section title={t("daily.title")}>
        <PlainLineChart
          labels={labels}
          series={[
            { id: "views", label: t("daily.views"), color: "blue" },
            { id: "viewers", label: t("daily.viewers"), color: "orange" },
          ]}
          values={{ views: data.daily.map((day) => day.views), viewers: data.daily.map((day) => day.viewers) }}
        />
      </Section>

      <Section title={t("visibleTime.title")}>
        <PlainLineChart
          labels={labels}
          series={[{ id: "visible", label: t("visibleTime.series"), color: "aqua" }]}
          values={{ visible: data.daily.map((day) => day.visibleMs / 60_000) }}
          format={(value) => format.number(value, 1)}
        />
      </Section>

      <Section title={t("pages.title")} wide>
        {data.pages.length === 0 ? (
          empty
        ) : (
          <PlainTable
            columns={[t("pages.path"), t("pages.views"), t("pages.users"), t("pages.reach"), t("pages.total"), t("pages.average"), t("pages.median")]}
            rows={data.pages.map((page) => [
              page.path,
              page.views,
              page.users,
              format.percent(data.activeUsers ? page.users / data.activeUsers : null),
              format.duration(page.totalMs),
              format.duration(page.averageMs),
              format.duration(page.medianMs),
            ])}
          />
        )}
      </Section>

      <Section title={t("trends.title")} wide>
        {data.trends.length === 0 ? (
          empty
        ) : (
          <PlainLineChart
            labels={labels}
            series={data.trends.map((trend, index) => ({ id: trend.path, label: trend.path, color: TREND_COLORS[index] }))}
            values={Object.fromEntries(data.trends.map((trend) => [trend.path, trend.values]))}
          />
        )}
      </Section>

      <Section title={t("heatmap.title")} wide>
        <PlainHeatmap
          columns={hours}
          rows={WEEKDAYS.map((weekday) => ({
            label: t(`heatmap.days.${weekday}`),
            values: data.heatmap.filter((cell) => cell.weekday === weekday).map((cell) => cell.views),
          }))}
        />
      </Section>

      <Section title={t("durations.title")}>
        <PlainBarChart bars={data.durations.map((row) => ({ label: row.bucket, value: row.views }))} />
      </Section>

      <Section title={t("areas.title")}>
        <PlainTable
          columns={["", t("devices.views"), t("devices.users"), t("devices.visible")]}
          rows={data.areas.map((row) => [t(`areas.${row.area}`), row.views, row.users, format.duration(row.visibleMs)])}
        />
      </Section>

      <Section title={t("devices.title")}>
        <div className="flex flex-col gap-4">
          <PlainBarList bars={data.devices.map((row) => ({ label: t(`devices.${row.device}`), value: row.views }))} />
          <PlainTable
            columns={[t("devices.device"), t("devices.views"), t("devices.users"), t("devices.visible")]}
            rows={data.devices.map((row) => [t(`devices.${row.device}`), row.views, row.users, format.duration(row.visibleMs)])}
          />
        </div>
      </Section>

      <Section title={t("multiDevice.title")}>
        <PlainBarChart bars={data.multiDevice.map((bin) => ({ label: t("multiDevice.label", { count: bin.value }), value: bin.count }))} color="aqua" />
      </Section>

      <Section title={t("devices.daily")} wide>
        <TimeSeriesChart
          unit="day"
          label={t("devices.daily")}
          totalLabel={t("devices.total")}
          series={[...devices]}
          points={data.devicesDaily.map((day) => ({ start: day.date, values: { desktop: day.desktop, mobile: day.mobile, tablet: day.tablet } }))}
        />
      </Section>
    </SectionGrid>
  );
}

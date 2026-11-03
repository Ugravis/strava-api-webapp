import type { AdminSiteActivityUsers } from "@kilotrace/shared/admin";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { getAdminTranslations } from "@/lib/admin/messages";
import { PlainBarChart, PlainBarList, PlainLineChart, PlainTable } from "./plain-charts";
import { Section, SectionGrid } from "./section";
import type { SiteActivityFormat } from "./site-activity-format";

export function UsersTab({ data, format }: { data: AdminSiteActivityUsers; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity");
  const labels = data.dates.map(format.day);
  const empty = <p className="text-sm text-muted-foreground">{t("empty")}</p>;

  return (
    <SectionGrid>
      <Section title={t("activeUsers.title")}>
        <PlainLineChart
          labels={labels}
          series={[
            { id: "dau", label: t("activeUsers.dau"), color: "blue" },
            { id: "wau", label: t("activeUsers.wau"), color: "orange" },
            { id: "mau", label: t("activeUsers.mau"), color: "aqua" },
          ]}
          values={{
            dau: data.activeUsers.map((day) => day.dau),
            wau: data.activeUsers.map((day) => day.wau),
            mau: data.activeUsers.map((day) => day.mau),
          }}
        />
      </Section>

      <Section title={t("stickiness.title")}>
        <PlainLineChart
          labels={labels}
          series={[{ id: "stickiness", label: t("stickiness.series"), color: "blue" }]}
          values={{ stickiness: data.activeUsers.map((day) => (day.mau === 0 ? 0 : day.dau / day.mau)) }}
          format={format.percent}
        />
      </Section>

      <Section title={t("newVsReturning.title")}>
        <TimeSeriesChart
          unit="day"
          label={t("newVsReturning.chart")}
          totalLabel={t("newVsReturning.total")}
          series={[
            { id: "new", label: t("newVsReturning.new"), color: "orange" },
            { id: "returning", label: t("newVsReturning.returning"), color: "blue" },
          ]}
          points={data.newVsReturning.map((day) => ({ start: day.date, values: { new: day.new, returning: day.returning } }))}
        />
      </Section>

      <Section title={t("dormancy.title")}>
        <PlainBarChart bars={data.dormancy.map((row) => ({ label: t(`dormancy.buckets.${row.bucket}`), value: row.users }))} />
      </Section>

      <Section title={t("weekly.title")} hint={t("weekly.hint")} wide>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <TimeSeriesChart
              unit="day"
              label={t("weekly.chart")}
              totalLabel={t("weekly.total")}
              series={[
                { id: "new", label: t("weekly.new"), color: "orange" },
                { id: "retained", label: t("weekly.retained"), color: "blue" },
                { id: "resurrected", label: t("weekly.resurrected"), color: "aqua" },
              ]}
              points={data.weekly.map((week) => ({
                start: week.week,
                values: { new: week.new, retained: week.retained, resurrected: week.resurrected },
              }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">{t("weekly.churned")}</span>
            <PlainBarChart bars={data.weekly.map((week) => ({ label: format.day(week.week), value: week.churned }))} color="orange" />
          </div>
        </div>
      </Section>

      <Section title={t("monthly.title")}>
        <div className="flex flex-col gap-4">
          <PlainBarChart bars={data.monthly.map((month) => ({ label: month.month.slice(2), value: month.users }))} />
          <span className="text-sm text-muted-foreground">{t("monthly.averageDays")}</span>
          <PlainBarChart bars={data.monthly.map((month) => ({ label: month.month.slice(2), value: month.averageDays }))} color="aqua" format={(value) => format.number(value, 1)} />
        </div>
      </Section>

      <Section title={t("activeDaysInPeriod.title")} hint={t("activeDaysInPeriod.hint")}>
        <PlainBarChart bars={data.activeDaysInPeriod.map((bin) => ({ label: `${bin.value} j`, value: bin.count }))} color="aqua" />
      </Section>

      <Section title={t("activeDays.title")} hint={t("activeDays.hint")} wide>
        {data.activeDays.length === 0 ? (
          empty
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {data.activeDays.map((month) => (
              <div key={month.month} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{month.month}</span>
                <PlainBarChart bars={month.distribution.map((bin) => ({ label: `${bin.value} j`, value: bin.count }))} color="aqua" />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("retention.title")} hint={t("retention.hint")} wide>
        {data.retention.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("retention.empty")}</p>
        ) : (
          <PlainTable
            columns={[t("retention.week"), t("retention.size"), "J+1", "J+7", "J+30", ...Array.from({ length: 8 }, (_, index) => `S+${index + 1}`)]}
            rows={data.retention.map((cohort) => [
              cohort.week,
              cohort.size,
              format.rate(cohort.d1),
              format.rate(cohort.d7),
              format.rate(cohort.d30),
              ...cohort.weeks.map(format.rate),
            ])}
          />
        )}
      </Section>

      <Section title={t("retentionCurve.title")} hint={t("retentionCurve.hint")} wide>
        <PlainLineChart
          labels={data.retentionCurve.map((point) => `J+${point.day}`)}
          series={[
            { id: "classic", label: t("retentionCurve.classic"), color: "blue" },
            { id: "rolling", label: t("retentionCurve.rolling"), color: "orange" },
          ]}
          values={{
            classic: data.retentionCurve.map(({ classic }) => (classic.eligible ? classic.retained / classic.eligible : 0)),
            rolling: data.retentionCurve.map(({ rolling }) => (rolling.eligible ? rolling.retained / rolling.eligible : 0)),
          }}
          format={format.percent}
        />
      </Section>

      <Section title={t("streaks.title")} hint={t("streaks.hint")}>
        <PlainBarChart bars={data.streaks.map((bin) => ({ label: `${bin.value} j`, value: bin.count }))} color="yellow" />
      </Section>

      <Section title={t("countries.title")}>
        {data.countries.length === 0 ? (
          empty
        ) : (
          <PlainTable
            columns={[t("countries.country"), t("segments.total"), t("segments.active")]}
            rows={data.countries.map((row) => [row.country ?? t("countries.none"), row.total, row.active])}
          />
        )}
      </Section>

      <Section title={t("segments.title")} hint={t("segments.hint")} wide>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PlainTable
            columns={[t("segments.segment"), t("segments.total"), t("segments.active"), t("segments.rate")]}
            rows={data.segments.map((row) => [
              t(`segments.names.${row.segment}`),
              row.total,
              row.active,
              format.percent(row.total ? row.active / row.total : null),
            ])}
          />
          <PlainBarList
            bars={data.segments.map((row) => ({ label: t(`segments.names.${row.segment}`), value: row.total ? row.active / row.total : 0 }))}
            format={format.percent}
          />
        </div>
      </Section>
    </SectionGrid>
  );
}

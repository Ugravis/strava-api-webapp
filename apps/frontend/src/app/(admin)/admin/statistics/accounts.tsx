import { getBusinessFormat, regionName } from "@/components/admin/business-statistics/business-format";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { LineChart } from "@/components/admin/site-activity/line-chart";
import { BarList, CardFigure, ChartHead } from "@/components/admin/site-activity/parts";
import { ChartLegend } from "@/components/admin/statistics/chart-legend";
import { getAdminTranslations } from "@/lib/admin/messages";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { type BusinessView, businessStatistics } from "./data";

const HEIGHT = 220;

/** The accounts: how many, how they came, how far they went, what they declare. */
export async function AccountsTab({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.accounts");
  const [format, data] = await Promise.all([getBusinessFormat(), businessStatistics("accounts", view.period, view.team)]);
  if (!data) return <DashboardUnavailable />;

  const labels = data.buckets.map((bucket) => format.bucket(data.unit, bucket));
  const titles = data.buckets.map((bucket) => format.bucketTitle(data.unit, bucket));
  const methods = [
    { id: "email", label: t("signups.email"), color: "blue" as const },
    { id: "google", label: t("signups.google"), color: "aqua" as const },
  ];
  const email = data.signups.map((point) => point.email);
  const google = data.signups.map((point) => point.google);
  const added = data.signups.reduce((sum, point) => sum + point.email + point.google, 0);
  const cumulated = data.signups.map((_, index) => data.signups.slice(0, index + 1).reduce((sum, point) => sum + point.email + point.google, data.accountsBefore));

  const steps = ["connected", "imported", "explored", "regular", "social"] as const;
  const { activation, profile, status } = data;
  const fields = ["avatar", "country", "sports", "city", "bio", "color"] as const;
  const recencyTotal = data.recency.reduce((sum, bucket) => sum + bucket.count, 0);
  const accounts = status.active + status.suspended;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("signups.title")} description={t("signups.description")} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={<CardFigure value={format.number(added)} label={t("signups.total")} />}
              legend={<ChartLegend items={methods} label={t("legend")} />}
            />
            <BarChart labels={labels} titles={titles} series={methods} values={{ email, google }} label={t("signups.title")} totalLabel={t("signups.total")} height={HEIGHT} />
          </div>
        </DashboardCard>
        <DashboardCard title={t("cumulated.title")} description={t("cumulated.description")}>
          <div className="flex flex-col gap-4">
            <ChartHead figures={<CardFigure value={format.number(cumulated.at(-1) ?? 0)} label={t("cumulated.today")} />} />
            <LineChart labels={labels} titles={titles} series={[{ id: "accounts", label: t("cumulated.series"), color: "blue" }]} values={{ accounts: cumulated }} label={t("cumulated.title")} height={HEIGHT} />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("activation.title")} description={t("activation.description", { count: activation.signedUp })}>
          <div className="flex flex-col gap-4">
            <BarList
              empty={t("activation.empty")}
              max={activation.signedUp}
              items={activation.signedUp === 0 ? [] : steps.map((step) => ({
                key: step,
                label: t(`activation.${step}`),
                value: activation[step],
                figure: `${format.number(activation[step])} · ${format.percent(format.ratio(activation[step], activation.signedUp), 0)}`,
              }))}
            />
            {data.medianDaysToConnect !== null && (
              <p className="text-xs text-muted-foreground">{t("activation.median", { days: format.number(data.medianDaysToConnect, 1) })}</p>
            )}
          </div>
        </DashboardCard>
        <DashboardCard title={t("profile.title")} description={t("profile.description")}>
          <BarList
            color="aqua"
            empty={t("profile.empty")}
            max={profile.total}
            items={fields.map((field) => ({
              key: field,
              label: t(`profile.${field}`),
              value: profile[field],
              figure: `${format.number(profile[field])} · ${format.percent(format.ratio(profile[field], profile.total), 0)}`,
            }))}
          />
        </DashboardCard>
        <DashboardCard title={t("recency.title")} description={t("recency.description")}>
          <BarList
            color="orange"
            empty={t("profile.empty")}
            max={recencyTotal}
            items={data.recency.map(({ bucket, count }) => ({
              key: bucket,
              label: t(`recency.buckets.${bucket as "never"}`),
              value: count,
              figure: `${format.number(count)} · ${format.percent(format.ratio(count, recencyTotal), 0)}`,
            }))}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("countries.title")} description={t("countries.description")}>
          <BarList
            empty={t("countries.empty")}
            max={accounts}
            items={data.countries.map(({ country, count }) => ({
              key: country ?? "none",
              label: country ? regionName(country) : t("countries.none"),
              value: count,
              figure: `${format.number(count)} · ${format.percent(format.ratio(count, accounts), 0)}`,
            }))}
          />
        </DashboardCard>
        <DashboardCard title={t("sports.title")} description={t("sports.description")}>
          <BarList
            color="aqua"
            empty={t("sports.empty")}
            items={data.favoriteSports.map(({ sport, count }) => ({ key: sport, label: format.sport(sport), value: count, figure: format.number(count) }))}
          />
        </DashboardCard>
        <DashboardCard title={t("status.title")} description={t("status.description")}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <CardFigure value={format.number(status.active)} label={t("status.active")} />
              <CardFigure value={format.number(status.suspended)} label={t("status.suspended")} />
              {view.team && <CardFigure value={format.number(status.team)} label={t("status.team")} />}
            </div>
            <BarList
              color="yellow"
              empty={t("status.noTags")}
              items={data.tags.map(({ name, count }) => ({ key: name, label: name, value: count, figure: format.number(count) }))}
            />
          </div>
        </DashboardCard>
      </div>
    </>
  );
}

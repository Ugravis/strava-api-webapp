import { ADMIN_BUSINESS_PERIODS } from "@kilotrace/shared/admin";
import { getBusinessFormat } from "@/components/admin/business-statistics/business-format";
import { ViewSwitch } from "@/components/admin/site-activity/parts";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminTranslations } from "@/lib/admin/messages";
import { type BusinessView, businessStatistics, viewHref } from "./data";

/** Title and choices of the page; the facts of the period stream into the description. */
export function BusinessHeader({ view, description }: { view: BusinessView; description: React.ReactNode }) {
  const t = getAdminTranslations("businessStatistics.header");
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t("title")} description={description} />
      <div className="flex flex-wrap gap-2">
        <ViewSwitch
          label={t("period")}
          options={ADMIN_BUSINESS_PERIODS.map((period) => ({
            key: period,
            label: t(`periods.${period}`),
            href: viewHref(view, { period }),
            current: period === view.period,
          }))}
        />
        <ViewSwitch
          label={t("teamSwitch")}
          options={[false, true].map((team) => ({
            key: String(team),
            label: t(team ? "withTeam" : "withoutTeam"),
            href: viewHref(view, { team }),
            current: team === view.team,
          }))}
        />
      </div>
    </div>
  );
}

/** The range of the period and how the figures are counted. */
export async function BusinessFacts({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.header");
  const [format, overview] = await Promise.all([getBusinessFormat(), businessStatistics("overview", view.period, view.team)]);
  if (!overview) return t("fallback");
  return [
    overview.period === "all"
      ? t("rangeAll", { from: format.longDate(overview.buckets[0]) })
      : t("range", { from: format.longDate(overview.buckets[0]), unit: t(`perUnit.${overview.unit as "day"}`) }),
    t("activityDates"),
    t("computedAt", { time: new Date(overview.generatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) }),
  ].join(" · ");
}

export function BusinessFactsSkeleton() {
  // Within the paragraph of the description: a span, not the div of the skeleton.
  return <span className="inline-block h-3.5 w-96 max-w-full animate-pulse rounded-md bg-muted align-middle" />;
}

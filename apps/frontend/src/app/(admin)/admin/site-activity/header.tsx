import { ADMIN_SITE_ACTIVITY_PERIODS } from "@kilotrace/shared/admin";
import { ViewSwitch } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminTranslations } from "@/lib/admin/messages";
import { siteActivity, type SiteActivityView, viewHref } from "./data";

/** Title and choices of the page; the facts of the period stream into the description. */
export function SiteActivityHeader({ view, description }: { view: SiteActivityView; description: React.ReactNode }) {
  const t = getAdminTranslations("siteActivity.header");
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t("title")} description={description} />
      <div className="flex flex-wrap gap-2">
        <ViewSwitch
          label={t("period")}
          options={ADMIN_SITE_ACTIVITY_PERIODS.map((days) => ({ key: String(days), label: t("days", { days }), href: viewHref(view, { days }), current: days === view.days }))}
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
        <ViewSwitch
          label={t("adminSwitch")}
          options={[true, false].map((admin) => ({
            key: String(admin),
            label: t(admin ? "withAdmin" : "withoutAdmin"),
            href: viewHref(view, { admin }),
            current: admin === view.admin,
          }))}
        />
      </div>
    </div>
  );
}

/** The period, the start of the collection and the accounts. */
export async function SiteActivityFacts({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.header");
  const [format, overview] = await Promise.all([getSiteActivityFormat(), siteActivity("overview", view.days, view.team, view.admin)]);
  if (!overview) return t("fallback");
  return [
    t("range", { from: format.day(overview.dates[0]), to: format.day(overview.dates.at(-1) ?? overview.dates[0]) }),
    overview.trackedSince ? t("tracked", { date: format.longDate(overview.trackedSince) }) : t("notTracked"),
    t("accounts", { count: overview.users, share: format.percent(format.ratio(overview.current.activeUsers, overview.users), 0) }),
    ...(view.admin ? [] : [t("adminExcluded")]),
  ].join(" · ");
}

export function SiteActivityFactsSkeleton() {
  // Within the paragraph of the description: a span, not the div of the skeleton.
  return <span className="inline-block h-3.5 w-96 max-w-full animate-pulse rounded-md bg-muted align-middle" />;
}

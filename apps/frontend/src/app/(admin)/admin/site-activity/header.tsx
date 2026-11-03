import { ADMIN_SITE_ACTIVITY_PERIODS } from "@kilotrace/shared/admin";
import Link from "next/link";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { siteActivity, type SiteActivityView, viewHref } from "./data";

/** A choice of the page, kept in the address, as the team switch of the dashboard. */
function ViewSwitch({ label, options }: { label: string; options: { key: string; label: string; href: string; current: boolean }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5 text-xs font-medium" role="group" aria-label={label}>
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          scroll={false}
          aria-current={option.current ? "true" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 transition-colors",
            option.current ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

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

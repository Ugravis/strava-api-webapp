import {
  ADMIN_SITE_ACTIVITY_PERIODS,
  type AdminSiteActivityPeriod,
  type AdminSiteActivityResponses,
  type AdminSiteActivitySection,
} from "@kilotrace/shared/admin";
import Link from "next/link";
import { getFormatter } from "next-intl/server";
import { FunnelTab } from "@/components/admin/site-activity/funnel-tab";
import { OverviewTiles } from "@/components/admin/site-activity/overview-tiles";
import { PagesTab } from "@/components/admin/site-activity/pages-tab";
import { ParamsTab } from "@/components/admin/site-activity/params-tab";
import { SessionsTab } from "@/components/admin/site-activity/sessions-tab";
import { getSiteActivityFormat, type SiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { UsersTab } from "@/components/admin/site-activity/users-tab";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";

const DEFAULT_DAYS: AdminSiteActivityPeriod = 30;

/** Tabs of the page, each a section of the API; the overview stays above them. */
const TABS = ["users", "pages", "sessions", "params", "funnel"] as const satisfies AdminSiteActivitySection[];

type Tab = (typeof TABS)[number];

const periodOf = (value: unknown): AdminSiteActivityPeriod =>
  ADMIN_SITE_ACTIVITY_PERIODS.find((days) => String(days) === value) ?? DEFAULT_DAYS;

const tabOf = (value: unknown): Tab => TABS.find((tab) => tab === value) ?? "users";

/**
 * Temporary page: plain charts of every metric of the site activity, to
 * check the data collected. A real dashboard replaces it.
 */
export default async function AdminSiteActivityPage({ searchParams }: PageProps<"/admin/site-activity">) {
  await requireAdminMember();
  const params = await searchParams;
  const days = periodOf(params.days);
  const team = params.team === "true";
  const tab = tabOf(params.tab);
  const t = getAdminTranslations("siteActivity");
  const [intl, format] = await Promise.all([getFormatter(), getSiteActivityFormat()]);
  const query = `?days=${days}&team=${team}`;
  const [overview, section] = await Promise.all([
    adminApi<AdminSiteActivityResponses["overview"]>(`/site-activity/overview${query}`),
    adminApi<AdminSiteActivityResponses[Tab]>(`/site-activity/${tab}${query}`),
  ]);

  const href = (next: { days?: number; team?: boolean; tab?: Tab }) =>
    `${adminRoutes.siteActivity}?days=${next.days ?? days}&team=${next.team ?? team}&tab=${next.tab ?? tab}`;

  return (
    <>
      <PageHeader title={t("title")} description={t("description", { days })} />
      <div className="flex flex-wrap gap-2">
        {ADMIN_SITE_ACTIVITY_PERIODS.map((period) => (
          <Button key={period} size="sm" variant={period === days ? "default" : "outline"} render={<Link href={href({ days: period })} />} nativeButton={false}>
            {t("period", { days: period })}
          </Button>
        ))}
        <Button size="sm" variant="outline" render={<Link href={href({ team: !team })} />} nativeButton={false}>
          {team ? t("teamIncluded") : t("teamExcluded")}
        </Button>
      </div>

      {overview.ok && section.ok ? (
        <>
          <p className="text-sm text-muted-foreground">
            {overview.data.trackedSince
              ? t("trackedSince", { date: intl.dateTime(new Date(`${overview.data.trackedSince}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" }) })
              : t("notTracked")}
          </p>
          <OverviewTiles data={overview.data} format={format} />
          <div className="flex flex-wrap gap-2 border-b pb-2">
            {TABS.map((entry) => (
              <Button key={entry} size="sm" variant={entry === tab ? "secondary" : "ghost"} render={<Link href={href({ tab: entry })} />} nativeButton={false}>
                {t(`tabs.${entry}`)}
              </Button>
            ))}
          </div>
          <TabContent tab={tab} data={section.data} format={format} />
        </>
      ) : (
        <Card>
          <CardContent className="text-sm text-muted-foreground">{t("error")}</CardContent>
        </Card>
      )}
    </>
  );
}

/** The data of a section always comes from the endpoint of its tab. */
function TabContent({ tab, data, format }: { tab: Tab; data: AdminSiteActivityResponses[Tab]; format: SiteActivityFormat }) {
  switch (tab) {
    case "users":
      return <UsersTab data={data as AdminSiteActivityResponses["users"]} format={format} />;
    case "pages":
      return <PagesTab data={data as AdminSiteActivityResponses["pages"]} format={format} />;
    case "sessions":
      return <SessionsTab data={data as AdminSiteActivityResponses["sessions"]} format={format} />;
    case "params":
      return <ParamsTab data={data as AdminSiteActivityResponses["params"]} format={format} />;
    case "funnel":
      return <FunnelTab data={data as AdminSiteActivityResponses["funnel"]} format={format} />;
  }
}

import type { AdminSiteActivityTotals } from "@kilotrace/shared/admin";
import { EyeIcon, HourglassIcon, RouteIcon, UserCheckIcon } from "lucide-react";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { KpiGrid, KpiStrip, KpiStripFigure, KpiStripSkeleton, KpiTile, KpiTileSkeleton } from "@/components/admin/kpi-tile";
import { siteActivity, type SiteActivityView, viewHref } from "./data";

/** The headline figures of the period against the one before, each opening its tab; then the ratios. */
export async function SiteActivityKpis({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.kpis");
  const [format, overview, pages, sessions] = await Promise.all([
    getSiteActivityFormat(),
    siteActivity("overview", view.days, view.team, view.admin),
    siteActivity("pages", view.days, view.team, view.admin),
    siteActivity("sessions", view.days, view.team, view.admin),
  ]);
  if (!overview) return null;
  const { current, previous } = overview;
  const trend = (key: keyof AdminSiteActivityTotals) => {
    const text = format.change(current[key], previous[key]);
    return text === null ? null : { ratio: current[key] - previous[key], text };
  };
  const previousOf = (value: string) => t("previous", { value });
  const perActive = (value: number) => (current.activeUsers > 0 ? format.number(value / current.activeUsers, 1) : "–");

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <KpiGrid>
        <KpiTile
          icon={UserCheckIcon}
          label={t("activeUsers")}
          color="blue"
          href={viewHref(view, { tab: "audience" })}
          value={format.number(current.activeUsers)}
          trend={trend("activeUsers")}
          detail={previousOf(format.number(previous.activeUsers))}
          spark={pages?.daily.map((day) => day.viewers)}
        />
        <KpiTile
          icon={EyeIcon}
          label={t("views")}
          color="aqua"
          href={viewHref(view, { tab: "pages" })}
          value={format.number(current.views)}
          trend={trend("views")}
          detail={t("perActive", { value: perActive(current.views) })}
          spark={pages?.daily.map((day) => day.views)}
        />
        <KpiTile
          icon={RouteIcon}
          label={t("sessions")}
          color="orange"
          href={viewHref(view, { tab: "sessions" })}
          value={format.number(current.sessions)}
          trend={trend("sessions")}
          detail={t("perActive", { value: perActive(current.sessions) })}
          spark={sessions?.daily.map((day) => day.sessions)}
        />
        <KpiTile
          icon={HourglassIcon}
          label={t("visibleMs")}
          color="yellow"
          href={viewHref(view, { tab: "pages" })}
          value={format.duration(current.visibleMs)}
          trend={trend("visibleMs")}
          detail={previousOf(format.duration(previous.visibleMs))}
          spark={pages?.daily.map((day) => day.visibleMs)}
        />
      </KpiGrid>
      <KpiStrip>
        <KpiStripFigure
          label={t("newUsers")}
          value={format.number(current.newUsers)}
          detail={[format.change(current.newUsers, previous.newUsers), previousOf(format.number(previous.newUsers))].filter(Boolean).join(" · ")}
        />
        <KpiStripFigure label={t("stickiness")} value={format.percent(overview.stickiness)} detail={t("stickinessDetail")} />
        <KpiStripFigure label={t("averageSession")} value={format.duration(overview.averageSessionMs)} detail={t("averageSessionDetail")} />
        <KpiStripFigure
          label={t("pagesPerSession")}
          value={overview.pagesPerSession === null ? "–" : format.number(overview.pagesPerSession, 1)}
          detail={t("pagesPerSessionDetail")}
        />
        <KpiStripFigure label={t("bounceRate")} value={format.percent(overview.bounceRate)} detail={t("bounceRateDetail")} />
      </KpiStrip>
    </div>
  );
}

export function SiteActivityKpisSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <KpiGrid>
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </KpiGrid>
      <KpiStripSkeleton />
    </div>
  );
}

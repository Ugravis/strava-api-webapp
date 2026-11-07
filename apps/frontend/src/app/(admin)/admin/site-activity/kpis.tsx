import type { AdminSiteActivityTotals } from "@kilotrace/shared/admin";
import { EyeIcon, HourglassIcon, RouteIcon, UserCheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { KpiTile, KpiTileSkeleton } from "../dashboard/parts";
import { siteActivity, type SiteActivityView, viewHref } from "./data";

/** A figure of the strip under the tiles. */
export function StripFigure({ label, value, detail }: { label: string; value: ReactNode; detail: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-4 py-3.5">
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{detail}</span>
    </div>
  );
}

/** Cells parted by lines of the border, the last across the row on two columns. */
export const STRIP = "grid grid-cols-2 gap-px bg-border md:grid-cols-5 [&>*]:bg-card [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1";

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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
      </div>
      <Card className={cn("gap-0 overflow-hidden py-0", STRIP)}>
        <StripFigure
          label={t("newUsers")}
          value={format.number(current.newUsers)}
          detail={[format.change(current.newUsers, previous.newUsers), previousOf(format.number(previous.newUsers))].filter(Boolean).join(" · ")}
        />
        <StripFigure label={t("stickiness")} value={format.percent(overview.stickiness)} detail={t("stickinessDetail")} />
        <StripFigure label={t("averageSession")} value={format.duration(overview.averageSessionMs)} detail={t("averageSessionDetail")} />
        <StripFigure
          label={t("pagesPerSession")}
          value={overview.pagesPerSession === null ? "–" : format.number(overview.pagesPerSession, 1)}
          detail={t("pagesPerSessionDetail")}
        />
        <StripFigure label={t("bounceRate")} value={format.percent(overview.bounceRate)} detail={t("bounceRateDetail")} />
      </Card>
    </div>
  );
}

export function SiteActivityKpisSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </div>
      <Skeleton className="h-22 w-full rounded-xl" />
    </div>
  );
}

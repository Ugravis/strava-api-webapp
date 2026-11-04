import { ActivityIcon, MapPinnedIcon, RouteIcon, UsersIcon } from "lucide-react";
import { getBusinessFormat } from "@/components/admin/business-statistics/business-format";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { KpiTile, KpiTileSkeleton } from "../dashboard/parts";
import { STRIP, StripFigure } from "../site-activity/kpis";
import { type BusinessView, businessStatistics, viewHref } from "./data";

/** The headline figures of the period against the one before, each opening its tab; then the ratios. */
export async function BusinessKpis({ view }: { view: BusinessView }) {
  const t = getAdminTranslations("businessStatistics.kpis");
  const [format, overview] = await Promise.all([getBusinessFormat(), businessStatistics("overview", view.period, view.team)]);
  if (!overview) return null;
  const { accounts, connected, newAccounts, athletes, activities, distanceM, movingS, elevationM, discoveries, series } = overview;
  const previousOf = (value: string | null) => (value === null ? t("wholeHistory") : t("previous", { value }));
  const previousNumber = (previous: number | null) => previousOf(previous === null ? null : format.number(previous));
  const perAthlete = (value: number, digits = 1) => (athletes.current > 0 ? format.number(value / athletes.current, digits) : "–");

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          icon={UsersIcon}
          label={t("accounts")}
          color="blue"
          href={viewHref(view, { tab: "accounts" })}
          value={format.number(accounts)}
          trend={format.trend(newAccounts)}
          detail={t("newAccounts", { count: newAccounts.current })}
          spark={series.accounts}
        />
        <KpiTile
          icon={ActivityIcon}
          label={t("athletes")}
          color="aqua"
          href={viewHref(view, { tab: "sports" })}
          value={format.number(athletes.current)}
          trend={format.trend(athletes)}
          detail={t("athletesShare", { share: format.percent(format.ratio(athletes.current, accounts), 0) })}
          spark={series.athletes}
        />
        <KpiTile
          icon={MapPinnedIcon}
          label={t("activities")}
          color="orange"
          href={viewHref(view, { tab: "sports" })}
          value={format.number(activities.current)}
          trend={format.trend(activities)}
          detail={previousNumber(activities.previous)}
          spark={series.activities}
        />
        <KpiTile
          icon={RouteIcon}
          label={t("distance")}
          color="yellow"
          href={viewHref(view, { tab: "sports" })}
          value={format.km(distanceM.current)}
          trend={format.trend(distanceM)}
          detail={previousOf(distanceM.previous === null ? null : format.km(distanceM.previous))}
          spark={series.distanceM}
        />
      </div>
      <Card className={cn("gap-0 overflow-hidden py-0", STRIP)}>
        <StripFigure label={t("connectionRate")} value={format.percent(format.ratio(connected, accounts), 0)} detail={t("connectionRateDetail", { connected, accounts })} />
        <StripFigure label={t("perAthlete")} value={perAthlete(activities.current)} detail={t("perAthleteDetail", { distance: format.km(athletes.current > 0 ? distanceM.current / athletes.current : 0) })} />
        <StripFigure label={t("moving")} value={format.hours(movingS.current)} detail={previousOf(movingS.previous === null ? null : format.hours(movingS.previous))} />
        <StripFigure label={t("elevation")} value={format.meters(elevationM.current)} detail={previousOf(elevationM.previous === null ? null : format.meters(elevationM.previous))} />
        <StripFigure label={t("discoveries")} value={format.number(discoveries.current)} detail={previousNumber(discoveries.previous)} />
      </Card>
    </div>
  );
}

export function BusinessKpisSkeleton() {
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

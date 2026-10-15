"use client";

import { ActivityIcon, MountainIcon, RouteIcon, TimerIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { StatCard } from "./stat-card";

/** Activity totals; `version` refreshes them during a sync. */
export function ActivityStats({ version }: { version: string }) {
  const t = useTranslations("dashboard.stats");
  const format = useFormatter();
  const { stats, error } = useActivityStats(version);

  if (error && !stats) {
    return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <StatCard
        label={t("activities")}
        icon={ActivityIcon}
        value={stats && format.number(stats.count)}
      />
      <StatCard
        label={t("distance")}
        icon={RouteIcon}
        value={
          stats &&
          format.number(stats.totalDistanceM / 1000, {
            style: "unit",
            unit: "kilometer",
            maximumFractionDigits: 0,
          })
        }
      />
      <StatCard
        label={t("elevation")}
        icon={MountainIcon}
        value={
          stats &&
          format.number(stats.totalElevationGainM, {
            style: "unit",
            unit: "meter",
            maximumFractionDigits: 0,
          })
        }
      />
      <StatCard
        label={t("movingTime")}
        icon={TimerIcon}
        value={
          stats &&
          format.number(Math.floor(stats.totalMovingTimeS / 3600), {
            style: "unit",
            unit: "hour",
            unitDisplay: "short",
          })
        }
      />
    </div>
  );
}

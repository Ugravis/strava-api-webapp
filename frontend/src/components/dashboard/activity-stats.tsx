"use client";

import { ActivityIcon, RouteIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActivityStats } from "@/hooks/use-activity-stats";
import { StatCard } from "./stat-card";

/** Activity count and total distance; `version` refreshes them during a sync. */
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
    </div>
  );
}

"use client";

import { Grid2x2Icon, Grid3x3Icon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useTileStats } from "@/hooks/use-tile-stats";
import { StatCard } from "./stat-card";

/** Tile counters; `version` refreshes them while the tiles are computed. */
export function TileStats({ version }: { version: string }) {
  const t = useTranslations("dashboard.tiles");
  const format = useFormatter();
  const { stats, error } = useTileStats(version);

  if (error && !stats) {
    return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <StatCard label={t("tiles")} icon={Grid2x2Icon} value={stats && format.number(stats.tiles)} />
      <StatCard label={t("subtiles")} icon={Grid3x3Icon} value={stats && format.number(stats.subtiles)} />
    </div>
  );
}

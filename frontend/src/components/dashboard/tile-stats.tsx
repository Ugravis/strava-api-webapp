"use client";

import { Grid2x2Icon, Grid3x3Icon, type LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTileStats } from "@/hooks/use-tile-stats";
import type { TileLevelStats } from "@/lib/api/types";

/** Tile counters per level; `version` refreshes them while the tiles are computed. */
export function TileStats({ version }: { version: string }) {
  const t = useTranslations("dashboard.tiles");
  const { stats, error } = useTileStats(version);

  if (error && !stats) {
    return <p className="text-sm text-muted-foreground">{t("error")}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      <TileLevelCard title={t("tiles")} icon={Grid2x2Icon} stats={stats?.tiles ?? null} />
      <TileLevelCard title={t("subtiles")} icon={Grid3x3Icon} stats={stats?.subtiles ?? null} />
    </div>
  );
}

interface TileLevelCardProps {
  title: string;
  icon: LucideIcon;
  /** Null while loading. */
  stats: TileLevelStats | null;
}

function TileLevelCard({ title, icon: Icon, stats }: TileLevelCardProps) {
  const t = useTranslations("dashboard.tiles");
  const format = useFormatter();
  const share = stats && stats.visited > 0 ? stats.clustered / stats.visited : 0;
  const metrics: { label: string; value: string | null; detail?: string }[] = [
    { label: t("visited"), value: stats && format.number(stats.visited) },
    { label: t("maxSquare"), value: stats && t("squareSize", { size: stats.maxSquare }) },
    { label: t("maxCluster"), value: stats && format.number(stats.maxCluster) },
    {
      label: t("clustered"),
      value: stats && format.number(stats.clustered),
      detail: stats ? format.number(share, { style: "percent", maximumFractionDigits: 1 }) : undefined,
    },
  ];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {metrics.map(({ label, value, detail }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex items-baseline gap-1.5">
                {value === null ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <>
                    <span className="text-xl font-semibold tracking-tight tabular-nums">{value}</span>
                    {detail && <span className="text-xs text-muted-foreground tabular-nums">{detail}</span>}
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

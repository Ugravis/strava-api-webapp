"use client";

import { CircleAlertIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import type { ActivityTracksState } from "@/hooks/use-activity-tracks";
import type { TileLevelSummary, TilesSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ClusterKey, SquareKey, TileKey, TrackKey } from "./map-keys";
import type { MapLayers } from "./map-layers";

type TracksState = Pick<ActivityTracksState, "lines" | "status" | "progress" | "errorCode" | "retry">;

interface MapStatsBarProps {
  tracks: TracksState;
  /** Null while loading. */
  summary: TilesSummary | null;
  layers: MapLayers;
  onLayersChange: (layers: MapLayers) => void;
}

/**
 * Band under the map: the key figures of each layer, with the keys of their
 * colors, and the checkboxes of the optional layers. On narrow screens, the
 * sections scroll sideways; on larger ones, they share the width in equal
 * columns, their content centered.
 */
export function MapStatsBar({ tracks, summary, layers, onLayersChange }: MapStatsBarProps) {
  const t = useTranslations("map.stats");

  return (
    <section
      aria-label={t("label")}
      className="flex shrink-0 snap-x snap-mandatory divide-x overflow-x-auto border-t bg-background [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible"
    >
      <TracksSection
        tracks={tracks}
        checked={layers.tracks}
        onCheckedChange={(checked) => onLayersChange({ ...layers, tracks: checked })}
      />
      <TilesSection level="tiles" summary={summary?.tiles} />
      <TilesSection
        level="subtiles"
        summary={summary?.subtiles}
        checked={layers.subtiles}
        onCheckedChange={(checked) => onLayersChange({ ...layers, subtiles: checked })}
      />
    </section>
  );
}

interface StatsSectionProps {
  title: string;
  /** Without it, the layer is always drawn. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children: ReactNode;
}

/** One layer: its title, its checkbox if optional, and its figures, dimmed while hidden. */
function StatsSection({ title, checked, onCheckedChange, children }: StatsSectionProps) {
  const optional = checked !== undefined && onCheckedChange !== undefined;
  const dimmed = optional && !checked;
  const heading = <span className="text-xs font-medium text-muted-foreground">{title}</span>;

  return (
    <div className="flex shrink-0 snap-start flex-col gap-2 px-4 py-3 md:min-w-0 md:items-center md:px-6">
      {optional ? (
        <label className="flex w-fit cursor-pointer items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
          {heading}
        </label>
      ) : (
        heading
      )}
      <div className={cn("flex gap-6 transition-opacity md:justify-center lg:gap-10", dimmed && "opacity-40")}>
        {children}
      </div>
    </div>
  );
}

/** A key figure, its label and the key of its color. */
function Stat({ value, label, colorKey }: { value: ReactNode; label: string; colorKey: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 md:items-center">
      <span className="text-base leading-tight font-semibold tabular-nums">{value}</span>
      <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
        {colorKey}
        {label}
      </span>
    </div>
  );
}

const ValueSkeleton = () => <Skeleton className="h-5 w-12" />;

function TilesSection({
  level,
  summary,
  checked,
  onCheckedChange,
}: {
  level: "tiles" | "subtiles";
  /** Undefined while loading. */
  summary: TileLevelSummary | undefined;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const t = useTranslations("map.stats");
  const format = useFormatter();
  const value = (render: (summary: TileLevelSummary) => string) => (summary ? render(summary) : <ValueSkeleton />);
  const size = (summary: TileLevelSummary) => summary.maxSquare?.size ?? 0;

  return (
    <StatsSection title={t(level)} checked={checked} onCheckedChange={onCheckedChange}>
      <Stat value={value((s) => format.number(s.visited))} label={t("visited")} colorKey={<TileKey subtiles={level === "subtiles"} />} />
      <Stat value={value((s) => format.number(s.maxCluster))} label={t("maxCluster")} colorKey={<ClusterKey subtiles={level === "subtiles"} />} />
      <Stat
        value={value((s) => `${size(s)} × ${size(s)}`)}
        label={t("maxSquare")}
        colorKey={<SquareKey />}
      />
    </StatsSection>
  );
}

function TracksSection({
  tracks: { lines, status, progress, errorCode, retry },
  checked,
  onCheckedChange,
}: {
  tracks: TracksState;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const t = useTranslations("map");
  const format = useFormatter();
  const syncing = status === "syncing" || status === "idle";

  return (
    <StatsSection title={t("stats.tracks")} checked={checked} onCheckedChange={onCheckedChange}>
      <Stat
        value={lines ? format.number(lines.length) : <ValueSkeleton />}
        label={t("stats.trackCount", { count: lines?.length ?? 0 })}
        colorKey={<TrackKey />}
      />
      <div role="status" className="flex max-w-56 min-w-0 items-center text-xs text-muted-foreground">
        {status === "error" ? (
          <span className="flex items-center gap-2 text-destructive">
            <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
            <span>{errorCode === "TOO_MANY_REQUESTS" ? t("rateLimited") : t("error")}</span>
            <Button size="icon-xs" variant="ghost" onClick={retry} aria-label={t("retry")} title={t("retry")}>
              <RefreshCwIcon />
            </Button>
          </span>
        ) : syncing && lines ? (
          <span className="flex items-center gap-1.5">
            <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" aria-hidden />
            {progress ? t("syncing", { fetched: progress.fetched, total: progress.total }) : t("checking")}
          </span>
        ) : (
          status === "ready" &&
          lines?.length === 0 && (
            <Link href={routes.dashboard} className="underline underline-offset-4">
              {t("empty")}
            </Link>
          )
        )}
      </div>
    </StatsSection>
  );
}

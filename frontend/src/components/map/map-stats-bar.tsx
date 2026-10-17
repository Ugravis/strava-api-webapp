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
import { ClusterKey, OtherClusterKey, SquareKey, TileKey, TrackKey } from "./map-keys";
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
      <TilesSection
        level="tiles"
        summary={summary?.tiles}
        clusters={{
          checked: layers.tileClusters,
          onCheckedChange: (checked) => onLayersChange({ ...layers, tileClusters: checked }),
        }}
      />
      <TilesSection
        level="subtiles"
        summary={summary?.subtiles}
        checked={layers.subtiles}
        onCheckedChange={(checked) => onLayersChange({ ...layers, subtiles: checked })}
        clusters={{
          checked: layers.subtileClusters,
          onCheckedChange: (checked) => onLayersChange({ ...layers, subtileClusters: checked }),
          disabled: !layers.subtiles,
        }}
      />
    </section>
  );
}

interface StatsSectionProps {
  title: string;
  /** Without it, the layer is always drawn. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Figures in two columns from medium screens, rather than in a row: four do not fit a third of the band. */
  columns?: boolean;
  children: ReactNode;
}

/** One layer: its title, its checkbox if optional, and its figures, dimmed while hidden. */
function StatsSection({ title, checked, onCheckedChange, columns = false, children }: StatsSectionProps) {
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
      <div
        className={cn(
          "flex gap-6 transition-opacity md:justify-center",
          columns ? "md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-2 lg:gap-x-10" : "lg:gap-10",
          dimmed && "opacity-40",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A layer drawn on demand within a section. */
interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** A key figure, its label and the key of its color, with the checkbox of its layer if optional. */
function Stat({
  value,
  label,
  colorKey,
  toggle,
}: {
  value: ReactNode;
  label: string;
  colorKey: ReactNode;
  toggle?: ToggleProps;
}) {
  const caption = (
    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
      {toggle && (
        <Checkbox
          checked={toggle.checked && !toggle.disabled}
          onCheckedChange={(checked) => toggle.onCheckedChange(checked === true)}
          disabled={toggle.disabled}
        />
      )}
      {colorKey}
      {label}
    </span>
  );
  const content = (
    <>
      <span
        className={cn(
          "text-base leading-tight font-semibold tabular-nums transition-opacity",
          toggle && !toggle.checked && "opacity-40",
        )}
      >
        {value}
      </span>
      {caption}
    </>
  );
  const layout = "flex min-w-0 flex-col gap-0.5 md:items-center";
  return toggle ? (
    <label className={cn(layout, toggle.disabled ? "cursor-not-allowed" : "cursor-pointer")}>{content}</label>
  ) : (
    <div className={layout}>{content}</div>
  );
}

const ValueSkeleton = () => <Skeleton className="h-5 w-12" />;

function TilesSection({
  level,
  summary,
  checked,
  onCheckedChange,
  clusters,
}: {
  level: "tiles" | "subtiles";
  /** Undefined while loading. */
  summary: TileLevelSummary | undefined;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Checkbox of the clusters other than the largest. */
  clusters: ToggleProps;
}) {
  const t = useTranslations("map.stats");
  const format = useFormatter();
  const value = (render: (summary: TileLevelSummary) => ReactNode) => (summary ? render(summary) : <ValueSkeleton />);
  const size = (summary: TileLevelSummary) => summary.maxSquare?.size ?? 0;
  /** A figure and the share of the visited tiles it covers; a small share keeps two significant digits rather than rounding to 0 %. */
  const withShare = (text: string, tiles: number, { visited }: TileLevelSummary) => {
    const share = visited > 0 ? tiles / visited : 0;
    return (
      <>
        {text}
        {visited > 0 && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
            {format.number(
              share,
              share > 0 && share < 0.01
                ? { style: "percent", maximumSignificantDigits: 2 }
                : { style: "percent", maximumFractionDigits: 1 },
            )}
          </span>
        )}
      </>
    );
  };

  return (
    <StatsSection title={t(level)} checked={checked} onCheckedChange={onCheckedChange} columns>
      <Stat value={value((s) => format.number(s.visited))} label={t("visited")} colorKey={<TileKey subtiles={level === "subtiles"} />} />
      <Stat
        value={value((s) => withShare(`${size(s)} × ${size(s)}`, size(s) ** 2, s))}
        label={t("maxSquare")}
        colorKey={<SquareKey />}
      />
      <Stat
        value={value((s) => withShare(format.number(s.maxCluster), s.maxCluster, s))}
        label={t("maxCluster")}
        colorKey={<ClusterKey subtiles={level === "subtiles"} />}
      />
      <Stat
        value={value((s) => withShare(format.number(s.clustered - s.maxCluster), s.clustered - s.maxCluster, s))}
        label={t("otherClusters")}
        colorKey={<OtherClusterKey subtiles={level === "subtiles"} />}
        toggle={clusters}
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

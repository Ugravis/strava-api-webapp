"use client";

import {
  EyeIcon,
  EyeOffIcon,
  HistoryIcon,
  LoaderCircleIcon,
  LocateFixedIcon,
  type LucideIcon,
  SearchIcon,
  SunDimIcon,
  VolumeXIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { type ComponentProps, type ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { routes } from "@/config/routes";
import type { ActivityTracksState } from "@/hooks/use-activity-tracks";
import type { TileLevelSummary, TilesSummary, VisitedStations } from "@/lib/api/types";
import { updateSoundSettings, useSoundSettings } from "@/lib/sound/sound-settings";
import { cn } from "@/lib/utils";
import { ClusterKey, OtherClusterKey, RailKey, SquareKey, StationKey, TileKey, TrackKey } from "./map-keys";
import { MAP_MODULES, type MapLayers, type MapModule } from "./map-layers";
import { MAP_MODULE_ICONS } from "./map-module-icons";
import { Stat, ValueSkeleton } from "./map-stat";
import { TrainSpeedControl } from "./train-speed-control";

type TracksState = Pick<ActivityTracksState, "lines" | "status" | "progress" | "errorCode" | "retry">;

interface MapStatsBarProps {
  tracks: TracksState;
  /** Null while loading. */
  summary: TilesSummary | null;
  /** Null while loading. */
  stations: VisitedStations | null;
  layers: MapLayers;
  onLayersChange: (layers: MapLayers) => void;
  /** The module whose figures the band shows. */
  module: MapModule;
  /** Selects a module, which is then shown on the map. */
  onModuleSelect: (module: MapModule) => void;
  /** Whether the band of the history tool is open. */
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
  /** Whether the sector tool is in use: its search or its band open. */
  sectorOpen: boolean;
  /** Opens the tool on the sector at the center of the map, or closes it. */
  onSectorOpenChange: (open: boolean) => void;
  /** Opens the search of the sectors. */
  onSectorSearch: () => void;
}

/**
 * Band under the map, from left to right: the tools, the modules, each
 * selected or shown on the map by its button, and the figures of the module
 * selected. On narrow screens, the tools and modules share a row above the
 * figures, which scroll sideways.
 */
export function MapStatsBar({
  tracks,
  summary,
  stations,
  layers,
  onLayersChange,
  module,
  onModuleSelect,
  historyOpen,
  onHistoryOpenChange,
  sectorOpen,
  onSectorOpenChange,
  onSectorSearch,
}: MapStatsBarProps) {
  const t = useTranslations("map");
  useTracksErrorToast(tracks);

  return (
    <section aria-label={t("stats.label")} className="flex shrink-0 flex-col border-t bg-background md:flex-row">
      <div className="flex shrink-0 overflow-x-auto border-b scrollbar-none md:overflow-visible md:border-b-0 md:border-r">
        <ControlsGroup title={t("stats.tools")}>
          <SplitButton selected={historyOpen}>
            <ToolPart
              icon={HistoryIcon}
              label={t("history.open")}
              pressed={historyOpen}
              onPressedChange={onHistoryOpenChange}
            />
          </SplitButton>
          <SplitButton selected={sectorOpen}>
            <ToolPart
              icon={LocateFixedIcon}
              label={t("sector.open")}
              pressed={sectorOpen}
              onPressedChange={onSectorOpenChange}
            />
            <SplitPart
              selected={sectorOpen}
              icon
              aria-label={t("sector.search.title")}
              title={t("sector.search.title")}
              onClick={onSectorSearch}
            >
              <SearchIcon aria-hidden />
            </SplitPart>
          </SplitButton>
        </ControlsGroup>
        <ControlsGroup title={t("stats.modules")}>
          {MAP_MODULES.map((candidate) => (
            <ModuleButton
              key={candidate}
              module={candidate}
              selected={candidate === module}
              shown={layers[candidate]}
              onSelect={() => onModuleSelect(candidate)}
              onShownChange={(shown) => onLayersChange({ ...layers, [candidate]: shown })}
            />
          ))}
        </ControlsGroup>
      </div>
      {/* Every module in the same cell, only the one selected visible: the band keeps the height of the tallest. */}
      <div className="grid min-w-0 flex-1">
        {MAP_MODULES.map((candidate) => (
          <div
            key={candidate}
            role="group"
            aria-label={t("modules.data", { module: candidate })}
            className={cn(
              "min-w-0 transition-opacity [grid-area:1/1]",
              candidate !== module && "invisible",
              !layers[candidate] && "opacity-60",
            )}
          >
            {candidate === "tiles" ? (
              <TilesModule tracks={tracks} summary={summary} layers={layers} onLayersChange={onLayersChange} />
            ) : (
              <StationsModule stations={stations} layers={layers} onLayersChange={onLayersChange} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Tools or modules: a row of buttons without their title on narrow screens,
 * a titled column from medium ones.
 */
function ControlsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={title}
      className="flex shrink-0 items-center gap-1.5 px-3 py-2 not-last:border-r md:flex-col md:items-stretch md:gap-2 md:px-4 md:py-3"
    >
      <span aria-hidden className="hidden text-xs font-medium text-muted-foreground md:block">
        {title}
      </span>
      <div className="flex gap-1.5 md:flex-col">{children}</div>
    </div>
  );
}

/**
 * Frame of the buttons of the tools and the modules: one or two actions side
 * by side, outlined together, shaded while selected.
 */
function SplitButton({ selected, label, children }: { selected: boolean; label?: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex h-7 shrink-0 items-stretch overflow-hidden rounded-[min(var(--radius-md),12px)] border border-input transition-colors",
        selected && "border-foreground/30 bg-muted",
      )}
    >
      {children}
    </div>
  );
}

/** One action of a `SplitButton`: the first one takes the width, the next ones are icons after a line. */
function SplitPart({
  selected,
  icon = false,
  className,
  ...props
}: ComponentProps<typeof Button> & { selected: boolean; icon?: boolean }) {
  return (
    <Button
      variant="ghost"
      size={icon ? "icon-sm" : "sm"}
      className={cn(
        "h-auto rounded-none border-0 active:not-aria-[haspopup]:translate-y-0",
        icon ? "border-l border-l-input" : "flex-1 justify-start",
        selected && "hover:bg-foreground/5",
        selected && icon && "border-l-foreground/20",
        className,
      )}
      {...props}
    />
  );
}

/** The main action of a tool, by its icon alone on narrow screens. */
function ToolPart({
  icon: Icon,
  label,
  pressed,
  onPressedChange,
}: {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <SplitPart selected={pressed} aria-pressed={pressed} aria-label={label} onClick={() => onPressedChange(!pressed)}>
      <Icon aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </SplitPart>
  );
}

/**
 * Two actions in one button: its name selects the module, showing its
 * figures in the band, and its eye shows or hides it on the map.
 */
function ModuleButton({
  module,
  selected,
  shown,
  onSelect,
  onShownChange,
}: {
  module: MapModule;
  selected: boolean;
  shown: boolean;
  onSelect: () => void;
  onShownChange: (shown: boolean) => void;
}) {
  const t = useTranslations("map.modules");
  const Icon = MAP_MODULE_ICONS[module];
  const label = t(module);

  return (
    <SplitButton selected={selected} label={label}>
      <SplitPart
        selected={selected}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(!shown && "text-muted-foreground")}
      >
        <Icon aria-hidden />
        {label}
      </SplitPart>
      <SplitPart
        selected={selected}
        icon
        aria-pressed={shown}
        aria-label={t(shown ? "hide" : "show", { module })}
        title={t(shown ? "hide" : "show", { module })}
        onClick={() => onShownChange(!shown)}
        className={cn(!shown && "text-muted-foreground")}
      >
        {shown ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
      </SplitPart>
    </SplitButton>
  );
}

interface StatsSectionProps {
  title: string;
  /** Without it, the layer is drawn with its module. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Figures in two columns from medium screens, rather than in a row: four do not fit a third of the band. */
  columns?: boolean;
  children: ReactNode;
}

/** One layer of a module: its title, its checkbox if optional, and its figures, dimmed while hidden. */
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

interface ModuleProps {
  layers: MapLayers;
  onLayersChange: (layers: MapLayers) => void;
}

/**
 * The large tiles, the small tiles and the tracks, side by side; the tiles
 * share the width in equal columns, the tracks as narrow as their content.
 * An optional layer checked shows the module too.
 */
function TilesModule({
  tracks,
  summary,
  layers,
  onLayersChange,
}: ModuleProps & { tracks: TracksState; summary: TilesSummary | null }) {
  const check = (layer: "subtiles" | "tracks") => (checked: boolean) =>
    onLayersChange({
      ...layers,
      [layer]: checked,
      tiles: layers.tiles || checked,
    });

  return (
    <div className="flex snap-x snap-mandatory divide-x overflow-x-auto scrollbar-none md:grid md:grid-cols-[repeat(2,minmax(0,1fr))_auto] md:overflow-visible">
      <TilesSection level="tiles" summary={summary?.tiles} />
      <TilesSection
        level="subtiles"
        summary={summary?.subtiles}
        checked={layers.subtiles}
        onCheckedChange={check("subtiles")}
      />
      <TracksSection tracks={tracks} checked={layers.tracks} onCheckedChange={check("tracks")} />
    </div>
  );
}

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
      <Stat
        value={value((s) => format.number(s.visited))}
        label={t("visited")}
        colorKey={<TileKey subtiles={level === "subtiles"} />}
      />
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
      />
    </StatsSection>
  );
}

/** One toast for the failures of the tracks, replaced rather than stacked. */
const TRACKS_ERROR_TOAST = "tracks-error";

/**
 * Tells a failure of the tracks in a toast at the top of the screen, with a
 * way to try again, whichever module is selected: the band stays compact.
 */
function useTracksErrorToast({ status, errorCode, retry }: TracksState): void {
  const t = useTranslations("map");
  const errorMessage = status === "error" ? t(errorCode === "TOO_MANY_REQUESTS" ? "rateLimited" : "error") : null;

  useEffect(() => {
    if (!errorMessage) {
      toast.dismiss(TRACKS_ERROR_TOAST);
      return;
    }
    toast.error(errorMessage, {
      id: TRACKS_ERROR_TOAST,
      duration: Infinity,
      action: { label: t("retry"), onClick: retry },
    });
  }, [errorMessage, retry, t]);
}

function TracksSection({
  tracks: { lines, status, progress },
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
        {syncing && lines ? (
          <span className="flex items-center gap-1.5">
            <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" aria-hidden />
            {progress
              ? t("syncing", {
                  fetched: progress.fetched,
                  total: progress.total,
                })
              : t("checking")}
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

/**
 * The train stations visited and the kilometers of railway unlocked between
 * them, with the dimming of the map below them, which shows the module too.
 */
function StationsModule({ stations, layers, onLayersChange }: ModuleProps & { stations: VisitedStations | null }) {
  const t = useTranslations("map.stats");
  const format = useFormatter();
  const railwayM = stations?.links.reduce((total, link) => total + link.lengthM, 0) ?? 0;
  const sound = useSoundSettings();

  return (
    <div className="flex h-full items-center gap-x-6 overflow-x-auto pr-4 scrollbar-none md:justify-evenly md:pr-6">
      <div className="flex shrink-0 flex-col gap-1">
        <Toggle
          variant="outline"
          size="sm"
          pressed={layers.dimmed}
          onPressedChange={(dimmed) =>
            onLayersChange({
              ...layers,
              dimmed,
              stations: layers.stations || dimmed,
            })
          }
          className="justify-start"
        >
          <SunDimIcon aria-hidden />
          {t("dim")}
        </Toggle>
        <Toggle
          variant="outline"
          size="sm"
          pressed={!sound.enabled}
          onPressedChange={(muted) => updateSoundSettings({ enabled: !muted })}
          className="justify-start"
        >
          <VolumeXIcon aria-hidden />
          {t("mute")}
        </Toggle>
      </div>
      <Separator orientation="vertical" className="h-10 self-center" />
      <TrainSpeedControl />
      <Separator orientation="vertical" className="h-10 self-center" />
      <StatsSection title={t("stations")}>
        <Stat
          value={stations ? format.number(stations.stations.length) : <ValueSkeleton />}
          label={t("stationCount", { count: stations?.stations.length ?? 0 })}
          colorKey={<StationKey />}
        />
        <Stat
          value={
            stations ? (
              format.number(railwayM / 1000, {
                style: "unit",
                unit: "kilometer",
                maximumFractionDigits: 0,
              })
            ) : (
              <ValueSkeleton />
            )
          }
          label={t("railway")}
          colorKey={<RailKey />}
        />
      </StatsSection>
    </div>
  );
}

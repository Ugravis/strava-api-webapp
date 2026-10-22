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
  Volume2Icon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { routes } from "@/config/routes";
import type { ActivityTracksState } from "@/hooks/use-activity-tracks";
import type { TileLevelSummary, TilesSummary, VisitedStations } from "@/lib/api/types";
import { updateSoundSettings, useSoundSettings } from "@/lib/sound/sound-settings";
import { cn } from "@/lib/utils";
import { MAP_MODULES, type MapLayers, type MapModule } from "./map-layers";
import { MAP_MODULE_ICONS } from "./map-module-icons";
import { BandHeading, Stat, ValueSkeleton } from "./map-stat";
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
 * Band under the map: the modules, each selected or shown on the map by its
 * tab, and the tools, in a block on the left of the figures of the module
 * selected; in a row over them on narrow screens, where the tools keep only
 * their icons. Below large screens, the figures scroll sideways.
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
      {/* A row on narrow screens, the modules then the tools; from medium ones, two titled columns on the left. */}
      <div className="flex shrink-0 items-center gap-2 border-b px-2 py-1.5 md:items-center md:gap-4 md:border-r md:border-b-0 md:px-4 md:py-4">
        <ControlsGroup title={t("stats.tools")} className="max-md:ml-auto">
          <ToolButton
            icon={HistoryIcon}
            label={t("history.open")}
            pressed={historyOpen}
            onPressedChange={onHistoryOpenChange}
            className="md:justify-start"
          />
          <div className={cn("flex items-center rounded-lg", sectorOpen && TOOL_PRESSED)}>
            <ToolButton
              icon={LocateFixedIcon}
              label={t("sector.open")}
              pressed={sectorOpen}
              onPressedChange={onSectorOpenChange}
              className="rounded-r-none md:flex-1 md:justify-start"
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("sector.search.title")}
                    onClick={onSectorSearch}
                    className={cn(
                      "h-8 rounded-l-none border-l border-l-border md:h-7",
                      sectorOpen && "border-l-blue-500/30 text-inherit hover:bg-blue-500/10 hover:text-inherit",
                    )}
                  />
                }
              >
                <SearchIcon aria-hidden />
              </TooltipTrigger>
              <TooltipContent>{t("sector.search.title")}</TooltipContent>
            </Tooltip>
          </div>
        </ControlsGroup>
        <ControlsGroup title={t("stats.modules")} className="max-md:order-first">
          {MAP_MODULES.map((candidate) => (
            <ModuleTab
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

/** Tools or modules: their buttons in a row on narrow screens, in a column under their title from medium ones. */
function ControlsGroup({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <BandHeading className="hidden md:block">{title}</BandHeading>
      <div className="flex items-center gap-1 md:flex-col md:items-stretch">{children}</div>
    </div>
  );
}

/** A tool in use, tinted in the blue of the sliders. */
const TOOL_PRESSED = "bg-blue-500/12 text-blue-700 dark:text-blue-300";

/** A tool: its icon and, from small screens, its name; tinted while in use. */
function ToolButton({
  icon: Icon,
  label,
  pressed,
  onPressedChange,
  className,
}: {
  icon: LucideIcon;
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  className?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "h-8 px-2 sm:px-2.5 md:h-7",
        pressed && cn(TOOL_PRESSED, "hover:bg-blue-500/20 hover:text-inherit"),
        className,
      )}
    >
      <Icon aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

/**
 * Tab of a module, with two actions: its name selects the module, showing
 * its figures in the band, and its eye shows or hides it on the map.
 */
function ModuleTab({
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
  const visibility = t(shown ? "hide" : "show", { module });

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex h-8 shrink-0 items-center rounded-lg transition-colors md:h-7",
        selected ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex h-full flex-1 items-center gap-1.5 rounded-l-lg pr-1 pl-2.5 text-[0.8rem] font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5"
      >
        <Icon aria-hidden />
        <span>{label}</span>
      </button>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-pressed={shown}
              aria-label={visibility}
              onClick={() => onShownChange(!shown)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md outline-none md:size-6 hover:bg-foreground/8 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 [&_svg]:size-3.5",
                !shown && "text-muted-foreground",
              )}
            />
          }
        >
          {shown ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
        </TooltipTrigger>
        <TooltipContent>{visibility}</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface StatsSectionProps {
  title: string;
  /** Without it, the layer is drawn with its module. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Figures in a grid of two columns from large screens, rather than in a row. */
  columns?: boolean;
  className?: string;
  children: ReactNode;
}

/** One layer of a module: its title, its checkbox if optional, and its figures, dimmed while hidden; centered in its column from large screens. */
function StatsSection({ title, checked, onCheckedChange, columns = false, className, children }: StatsSectionProps) {
  const optional = checked !== undefined && onCheckedChange !== undefined;
  const dimmed = optional && !checked;
  const heading = <BandHeading>{title}</BandHeading>;

  return (
    <div className={cn("flex shrink-0 snap-start flex-col justify-center px-4 py-3 md:px-5 md:py-4 lg:min-w-0 lg:items-center", className)}>
      {/* Centered as a block, its title on the left of its figures. */}
      <div className="flex flex-col gap-2">
        {optional ? (
          <label className="flex h-4 w-fit cursor-pointer items-center gap-2">
            <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
            {heading}
          </label>
        ) : (
          <div className="flex h-4 items-center">{heading}</div>
        )}
        <div
          className={cn(
            "transition-opacity",
            columns ? "flex gap-6 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:gap-y-2" : "flex gap-6",
            dimmed && "opacity-40",
          )}
        >
          {children}
        </div>
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
    <div className="flex snap-x snap-mandatory divide-x overflow-x-auto scrollbar-none lg:grid lg:grid-cols-[repeat(2,minmax(0,1fr))_auto] lg:overflow-visible">
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
    <StatsSection
      title={t(level)}
      checked={checked}
      onCheckedChange={onCheckedChange}
      columns
    >
      <Stat
        value={value((s) => format.number(s.visited))}
        label={t("visited")}
        accent={level === "subtiles" ? "subtile" : "tile"}
      />
      <Stat
        value={value((s) => withShare(`${size(s)} × ${size(s)}`, size(s) ** 2, s))}
        label={t("maxSquare")}
        accent="square"
      />
      <Stat
        value={value((s) => withShare(format.number(s.maxCluster), s.maxCluster, s))}
        label={t("maxCluster")}
        accent={level === "subtiles" ? "subtileCluster" : "cluster"}
      />
      <Stat
        value={value((s) => withShare(format.number(s.clustered - s.maxCluster), s.clustered - s.maxCluster, s))}
        label={t("otherClusters")}
        accent={level === "subtiles" ? "otherSubtileClusters" : "otherClusters"}
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
        accent="track"
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
 * them, the settings of the map for them, of which the dimming of the map
 * below them also shows the module, and the speed of the trains.
 */
function StationsModule({ stations, layers, onLayersChange }: ModuleProps & { stations: VisitedStations | null }) {
  const t = useTranslations("map.stats");
  const format = useFormatter();
  const railwayM = stations?.links.reduce((total, link) => total + link.lengthM, 0) ?? 0;
  const sound = useSoundSettings();

  return (
    <div className="flex h-full snap-x snap-mandatory divide-x overflow-x-auto scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible">
      <StatsSection title={t("stations")}>
        <Stat
          value={stations ? format.number(stations.stations.length) : <ValueSkeleton />}
          label={t("stationCount", { count: stations?.stations.length ?? 0 })}
          accent="station"
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
          accent="railLink"
        />
      </StatsSection>
      {/* Titled from large screens only, where the band is taller: the band keeps its height below. Centered in the band. */}
      <div className="flex shrink-0 snap-start flex-col justify-center px-4 py-3 md:px-5 md:py-4 lg:items-center">
        <div className="flex flex-col gap-2">
          <BandHeading className="flex h-4 items-center max-lg:hidden">{t("display")}</BandHeading>
          <div className="flex flex-col gap-1.5">
            <SettingSwitch
              icon={SunDimIcon}
              label={t("dim")}
              checked={layers.dimmed}
              onCheckedChange={(dimmed) =>
                onLayersChange({
                  ...layers,
                  dimmed,
                  stations: layers.stations || dimmed,
                })
              }
            />
            <SettingSwitch
              icon={Volume2Icon}
              label={t("sound")}
              checked={sound.enabled}
              onCheckedChange={(enabled) => updateSoundSettings({ enabled })}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 snap-start flex-col justify-center px-4 py-3 md:px-5 md:py-4 lg:items-center">
        <TrainSpeedControl />
      </div>
    </div>
  );
}

/** A setting of a module, its icon and name before its switch. */
function SettingSwitch({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[0.8rem] whitespace-nowrap">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        {label}
      </label>
      <Switch id={id} size="sm" checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

"use client";

import {
  CircleDotIcon,
  GridIcon,
  LoaderCircleIcon,
  LocateIcon,
  type LucideIcon,
  RouteIcon,
  SettingsIcon,
  SunDimIcon,
  Volume2Icon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useId } from "react";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@kilotrace/ui/components/ui/popover";
import { Separator } from "@kilotrace/ui/components/ui/separator";
import { Switch } from "@kilotrace/ui/components/ui/switch";
import { routes } from "@/config/routes";
import type { ActivityTracksState } from "@/hooks/use-activity-tracks";
import { updateSoundSettings, useSoundSettings } from "@/lib/sound/sound-settings";
import type { MapLayers } from "./map-layers";
import { setLocationShown, useLocationShown } from "./location-setting";
import { BandHeading } from "./map-stat";
import { TrainSpeedControl } from "./train-speed-control";

type TracksState = Pick<ActivityTracksState, "lines" | "status" | "progress">;

interface MapSettingsProps {
  tracks: TracksState;
  layers: MapLayers;
  onLayersChange: (layers: MapLayers) => void;
}

/**
 * Settings of the map, in a popover opened by a round button in its bottom
 * right corner: the optional layers of the tiles, the display of the stations and
 * the speed of the trains, and the position of the user. An optional layer switched on shows its module too.
 */
export function MapSettings({ tracks, layers, onLayersChange }: MapSettingsProps) {
  const t = useTranslations("map");
  const sound = useSoundSettings();
  const locationShown = useLocationShown();
  const showTiles = (layer: "subtiles" | "tracks") => (checked: boolean) =>
    onLayersChange({ ...layers, [layer]: checked, tiles: layers.tiles || checked });

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={t("settings.open")}
            title={t("settings.open")}
            className="size-8 rounded-full bg-background shadow-md"
          />
        }
      >
        <SettingsIcon aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 gap-3 p-3">
        <SettingsGroup title={t("modules.tiles")}>
          <SettingSwitch
            icon={RouteIcon}
            label={t("stats.tracks")}
            count={tracks.status === "ready" && tracks.lines?.length ? tracks.lines.length : undefined}
            checked={layers.tracks}
            onCheckedChange={showTiles("tracks")}
          />
          <TracksStatus tracks={tracks} />
          <SettingSwitch
            icon={GridIcon}
            label={t("stats.subtiles")}
            checked={layers.subtiles}
            onCheckedChange={showTiles("subtiles")}
          />
        </SettingsGroup>
        <Separator />
        <SettingsGroup title={t("modules.stations")}>
          <SettingSwitch
            icon={SunDimIcon}
            label={t("stats.dim")}
            checked={layers.dimmed}
            onCheckedChange={(dimmed) => onLayersChange({ ...layers, dimmed, stations: layers.stations || dimmed })}
          />
          <SettingSwitch
            icon={CircleDotIcon}
            label={t("stats.discreetDots")}
            checked={layers.discreetDots}
            onCheckedChange={(discreetDots) => onLayersChange({ ...layers, discreetDots })}
          />
          <SettingSwitch
            icon={Volume2Icon}
            label={t("stats.sound")}
            checked={sound.enabled}
            onCheckedChange={(enabled) => updateSoundSettings({ enabled })}
          />
        </SettingsGroup>
        <Separator />
        <TrainSpeedControl />
        <Separator />
        <SettingsGroup title={t("settings.map")}>
          <SettingSwitch
            icon={LocateIcon}
            label={t("settings.location")}
            checked={locationShown}
            onCheckedChange={setLocationShown}
          />
        </SettingsGroup>
      </PopoverContent>
    </Popover>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-2">
      <BandHeading>{title}</BandHeading>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

/** The sync of the tracks while running, or the way to connect Strava without any, under their switch. */
function TracksStatus({ tracks: { lines, status, progress } }: { tracks: TracksState }) {
  const t = useTranslations("map");
  const syncing = status === "syncing" || status === "idle";
  if (!lines || (!syncing && lines.length > 0)) return null;

  return (
    <div role="status" className="pl-5.5 text-xs text-muted-foreground">
      {syncing ? (
        <span className="flex items-center gap-1.5">
          <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" aria-hidden />
          {progress ? t("syncing", { fetched: progress.fetched, total: progress.total }) : t("checking")}
        </span>
      ) : (
        <Link href={routes.dashboard} className="underline underline-offset-4">
          {t("empty")}
        </Link>
      )}
    </div>
  );
}

/** A setting, its icon and name, with a count in grey, before its switch. */
function SettingSwitch({
  icon: Icon,
  label,
  count,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const format = useFormatter();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-[0.8rem] whitespace-nowrap">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        {label}
        {count !== undefined && <span className="text-muted-foreground tabular-nums">({format.number(count)})</span>}
      </label>
      <Switch
        id={id}
        size="sm"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="data-checked:bg-blue-600 dark:data-checked:bg-blue-500 [&_[data-slot=switch-thumb]]:data-checked:bg-white"
      />
    </div>
  );
}

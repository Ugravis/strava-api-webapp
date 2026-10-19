"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { type TrackLine, useActivityTracks } from "@/hooks/use-activity-tracks";
import { useCountries } from "@/hooks/use-countries";
import { useCountrySector } from "@/hooks/use-country-sector";
import { useStations } from "@/hooks/use-stations";
import { useTileHistory } from "@/hooks/use-tile-history";
import { useTileSummary } from "@/hooks/use-tile-summary";
import {
  availableSteps,
  DEFAULT_STEP_INDEX,
  dayAtStep,
  dayOf,
  HISTORY_STEPS,
  type HistorySettings,
  historyInstant,
  withinSteps,
} from "@/lib/tiles/history-period";
import { NO_COUNTRIES, type VisitedCountries } from "./country-layer";
import { HistoryBand } from "./history-band";
import { addressFromSearch, type AddressedTool, searchWithAddress } from "./map-address";
import { MapBands } from "./map-bands";
import { publishMapModule, useMapModuleRequests } from "./map-module-channel";
import type { MapHistory } from "./history-layer";
import {
  mapDimmed,
  type MapLayers,
  type MapModule,
  tileModeOf,
  tracksShown,
  withModuleOpened,
} from "./map-layers";
import { MapSkeleton } from "./map-skeleton";
import { MapStatsBar } from "./map-stats-bar";
import { entryFromSearch } from "./panel-entry";
import { SectorBand } from "./sector-band";
import type { MapSector } from "./sector-layer";
import { SectorSearchDialog } from "./sector-search-dialog";

// MapLibre needs the browser (WebGL): it is neither prerendered nor shipped
// with the other pages.
const ActivityMap = dynamic(() => import("./activity-map").then((module) => module.ActivityMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const NO_LINES: TrackLine[] = [];

/** Tools of the map, each with its band: one at a time, their drawings would mix. */
type MapTool = "history" | "sector";

/**
 * The map, with nothing over it but its zoom buttons and, along its bottom,
 * the band of its key figures and above it the band of the tool open, the
 * history or the sector; both bands fold together.
 */
export function TracksMap() {
  const t = useTranslations("map");
  const searchParams = useSearchParams();
  const [today] = useState(() => dayOf(new Date()));
  // The address of the page may name the layers and the tool open: the map opens with them.
  const [fromAddress] = useState(() => {
    const search = searchParams.toString();
    return { ...addressFromSearch(search, today), focused: entryFromSearch(search).entry !== null };
  });
  const initialTool = fromAddress.address.tool;
  const tracks = useActivityTracks();
  const { summary } = useTileSummary();
  // Fetched again when new tracks arrive, and while new tiles are located.
  const { version } = useTrackSync();
  const { completion } = useCountries(String(version));
  const countries = useMemo<VisitedCountries>(
    () =>
      completion
        ? { codes: completion.countries.map((country) => country.code), shapesVersion: completion.shapesVersion }
        : NO_COUNTRIES,
    [completion],
  );
  const [layers, setLayers] = useState<MapLayers>(fromAddress.address.layers);
  const [module, setModule] = useState<MapModule>(fromAddress.address.module);
  const selectModule = useCallback((selected: MapModule) => {
    // A module selected is shown on the map.
    setModule(selected);
    setLayers((current) => ({ ...current, [selected]: true }));
  }, []);
  const openModule = useCallback((opened: MapModule) => {
    setModule(opened);
    setLayers((current) => withModuleOpened(current, opened));
  }, []);
  // The navigation shows the module selected, and opens another one on the map already open.
  useMapModuleRequests(openModule);
  useEffect(() => {
    publishMapModule(module);
    return () => publishMapModule(null);
  }, [module]);
  const { stations } = useStations(summary?.version ?? null);
  const [tool, setTool] = useState<MapTool | null>(initialTool?.kind ?? null);
  const historyOpen = tool === "history";
  // The sector tool opens on its search; a sector picked opens its band.
  const [searchOpen, setSearchOpen] = useState(false);
  const [sectorCode, setSectorCode] = useState<string | null>(initialTool?.kind === "sector" ? initialTool.code : null);
  // Incremented to frame the sector: when picked, and on demand. Named by the
  // address with a tile or an activity, it leaves the camera on them.
  const [sectorFrame, setSectorFrame] = useState(initialTool?.kind === "sector" && !fromAddress.focused ? 1 : 0);
  const shownSector = tool === "sector" ? sectorCode : null;
  const { sector, error: sectorError } = useCountrySector(shownSector, summary?.version ?? null);
  const sectorShapeVersion = sector?.shapeVersion ?? null;
  const sectorBounds = sector?.bounds ?? null;
  const mapSector = useMemo<MapSector | null>(
    () => (shownSector ? { code: shownSector, shapeVersion: sectorShapeVersion, bounds: sectorBounds } : null),
    [shownSector, sectorShapeVersion, sectorBounds],
  );
  const [historySettings, setHistorySettings] = useState<HistorySettings>(() =>
    initialTool?.kind === "history"
      ? initialTool.settings
      : { mode: "gained", date: dayAtStep(DEFAULT_STEP_INDEX, HISTORY_STEPS.length, today) },
  );
  // The steps reach back to the first visit, known with the first answer.
  const [firstVisitAt, setFirstVisitAt] = useState<string | null>(null);
  const stepCount = availableSteps(firstVisitAt, today);
  const shownSettings = withinSteps(historySettings, stepCount, today);
  const instant = historyInstant(shownSettings);
  const history = useTileHistory(historyOpen ? shownSettings.mode : null, instant, summary?.version ?? null);
  if (history.summary && history.summary.firstVisitAt !== firstVisitAt) setFirstVisitAt(history.summary.firstVisitAt);
  const historyVersion = history.summary ? (history.summary.version ?? "0") : null;
  // Drawn once the version of the first visits is known: the tiles are requested once.
  const mapHistory = useMemo<MapHistory | null>(
    () => (historyOpen && historyVersion !== null ? { mode: shownSettings.mode, instant, version: historyVersion } : null),
    [historyOpen, historyVersion, shownSettings.mode, instant],
  );

  useEffect(() => {
    if (fromAddress.invalid) toast.error(t("invalidLink"));
  }, [fromAddress, t]);

  useEffect(() => {
    // The address follows the map, without adding to the history of the browser.
    // The other parameters, those of the panel, are kept.
    const addressed: AddressedTool | null = historyOpen
      ? { kind: "history", settings: shownSettings }
      : shownSector
        ? { kind: "sector", code: shownSector }
        : null;
    const search = searchWithAddress(window.location.search, { layers, module, tool: addressed });
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
    }
  }, [layers, module, historyOpen, shownSettings, shownSector]);

  return (
    <div className="relative min-h-[60svh] flex-1 overflow-hidden">
      <div className="absolute inset-0">
        {/* Drawn at once: the tracks, read from the browser, arrive later. */}
        <ActivityMap
          lines={tracks.lines ?? NO_LINES}
          summary={summary}
          countries={countries}
          tileMode={tileModeOf(layers)}
          showTracks={tracksShown(layers)}
          history={mapHistory}
          sector={mapSector}
          sectorFrame={sectorFrame}
          stations={stations}
          showStations={layers.stations}
          dimmed={mapDimmed(layers, module)}
          label={t("label")}
        />
      </div>
      <MapBands>
        {historyOpen && (
          <HistoryBand
            settings={shownSettings}
            onSettingsChange={setHistorySettings}
            onClose={() => setTool(null)}
            summary={history.summary}
            loading={history.loading}
            error={history.error}
            stepCount={stepCount}
            today={today}
            subtiles={layers.subtiles}
          />
        )}
        {shownSector && (
          <SectorBand
            code={shownSector}
            sector={sector}
            error={sectorError}
            subtiles={layers.subtiles}
            onSearch={() => setSearchOpen(true)}
            onRecenter={() => setSectorFrame((count) => count + 1)}
            onClose={() => setTool(null)}
          />
        )}
        <MapStatsBar
          tracks={tracks}
          summary={summary}
          stations={stations}
          layers={layers}
          onLayersChange={setLayers}
          module={module}
          onModuleSelect={selectModule}
          historyOpen={historyOpen}
          onHistoryOpenChange={(open) => setTool(open ? "history" : null)}
          sectorOpen={shownSector !== null || searchOpen}
          onSectorOpenChange={(open) => {
            setSearchOpen(open);
            if (!open && tool === "sector") setTool(null);
          }}
        />
      </MapBands>
      <SectorSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        visited={completion?.countries ?? null}
        current={shownSector}
        onPick={(code) => {
          setSectorCode(code);
          setTool("sector");
          setSearchOpen(false);
          setSectorFrame((count) => count + 1);
        }}
      />
    </div>
  );
}

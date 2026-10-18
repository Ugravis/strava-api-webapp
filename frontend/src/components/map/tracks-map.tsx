"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { type TrackLine, useActivityTracks } from "@/hooks/use-activity-tracks";
import { useCountries } from "@/hooks/use-countries";
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
import type { MapHistory } from "./history-layer";
import { ALL_MAP_LAYERS, type MapLayers, tileModeOf } from "./map-layers";
import { MapSkeleton } from "./map-skeleton";
import { MapStatsBar } from "./map-stats-bar";

// MapLibre needs the browser (WebGL): it is neither prerendered nor shipped
// with the other pages.
const ActivityMap = dynamic(() => import("./activity-map").then((module) => module.ActivityMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const NO_LINES: TrackLine[] = [];

/**
 * The map, with nothing over it but its zoom buttons, the band of its key
 * figures below, and over it the band of the history tool when open.
 */
export function TracksMap() {
  const t = useTranslations("map");
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
  const [layers, setLayers] = useState<MapLayers>(ALL_MAP_LAYERS);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [today] = useState(() => dayOf(new Date()));
  const [historySettings, setHistorySettings] = useState<HistorySettings>(() => ({
    mode: "gained",
    date: dayAtStep(DEFAULT_STEP_INDEX, HISTORY_STEPS.length, today),
  }));
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

  return (
    <div className="flex min-h-[60svh] flex-1 flex-col">
      <div className="relative flex-1 overflow-hidden">
        {/* Drawn at once: the tracks, read from the browser, arrive later. */}
        <ActivityMap
          lines={tracks.lines ?? NO_LINES}
          summary={summary}
          countries={countries}
          tileMode={tileModeOf(layers)}
          showTracks={layers.tracks}
          history={mapHistory}
          label={t("label")}
        />
      </div>
      {historyOpen && (
        <HistoryBand
          settings={shownSettings}
          onSettingsChange={setHistorySettings}
          onClose={() => setHistoryOpen(false)}
          summary={history.summary}
          loading={history.loading}
          error={history.error}
          stepCount={stepCount}
          today={today}
          subtiles={layers.subtiles}
        />
      )}
      <MapStatsBar
        tracks={tracks}
        summary={summary}
        layers={layers}
        onLayersChange={setLayers}
        historyOpen={historyOpen}
        onHistoryOpenChange={setHistoryOpen}
      />
    </div>
  );
}

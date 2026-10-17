"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { type TrackLine, useActivityTracks } from "@/hooks/use-activity-tracks";
import { useCountries } from "@/hooks/use-countries";
import { useTileSummary } from "@/hooks/use-tile-summary";
import { NO_COUNTRIES, type VisitedCountries } from "./country-layer";
import { ALL_MAP_LAYERS, type MapLayers, tileViewOf } from "./map-layers";
import { MapSkeleton } from "./map-skeleton";
import { MapStatsBar } from "./map-stats-bar";

// MapLibre needs the browser (WebGL): it is neither prerendered nor shipped
// with the other pages.
const ActivityMap = dynamic(() => import("./activity-map").then((module) => module.ActivityMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const NO_LINES: TrackLine[] = [];

/** The map, with nothing over it but its zoom buttons, and the band of its key figures below. */
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
  const tileView = useMemo(() => tileViewOf(layers), [layers]);

  return (
    <div className="flex min-h-[60svh] flex-1 flex-col">
      <div className="relative flex-1 overflow-hidden">
        {/* Drawn at once: the tracks, read from the browser, arrive later. */}
        <ActivityMap
          lines={tracks.lines ?? NO_LINES}
          summary={summary}
          countries={countries}
          tileView={tileView}
          showTracks={layers.tracks}
          label={t("label")}
        />
      </div>
      <MapStatsBar tracks={tracks} summary={summary} layers={layers} onLayersChange={setLayers} />
    </div>
  );
}

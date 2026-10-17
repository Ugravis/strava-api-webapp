"use client";

import { CircleAlertIcon, InfoIcon, RefreshCwIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import { routes } from "@/config/routes";
import { useActivityTracks } from "@/hooks/use-activity-tracks";
import { useCountries } from "@/hooks/use-countries";
import { useTiles } from "@/hooks/use-tiles";
import { NO_COUNTRIES, type VisitedCountries } from "./country-layer";
import { MapSkeleton } from "./map-skeleton";
import type { TileMode } from "./tile-layers";
import { TileLegend } from "./tile-legend";
import { TileModeToggle } from "./tile-mode-toggle";
import { TracksStatus } from "./tracks-status";

// MapLibre needs the browser (WebGL): it is neither prerendered nor shipped
// with the other pages.
const ActivityMap = dynamic(() => import("./activity-map").then((module) => module.ActivityMap), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export function TracksMap() {
  const t = useTranslations("map");
  const { lines, status, progress, errorCode, retry } = useActivityTracks();
  const { explored } = useTiles();
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
  const [tileMode, setTileMode] = useState<TileMode>("tiles");

  return (
    <div className="relative min-h-[60svh] flex-1 overflow-hidden rounded-xl border">
      {lines ? (
        <ActivityMap lines={lines} explored={explored} countries={countries} tileMode={tileMode} label={t("label")} />
      ) : (
        <MapSkeleton />
      )}

      <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col items-start gap-2 [&>*]:pointer-events-auto">
        <TracksStatus lines={lines} status={status} progress={progress} />
        {lines && <TileModeToggle mode={tileMode} onChange={setTileMode} />}
        {lines && <TileLegend explored={explored} mode={tileMode} />}
      </div>

      <div className="pointer-events-none absolute inset-x-3 bottom-8 flex flex-col gap-2 sm:right-auto sm:max-w-md [&>*]:pointer-events-auto">
        {status === "error" && (
          <Alert variant="destructive" className="bg-background/95 shadow-sm">
            <CircleAlertIcon />
            <AlertDescription>
              {errorCode === "TOO_MANY_REQUESTS" ? t("rateLimited") : t("error")}
            </AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCwIcon />
                {t("retry")}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {status === "ready" && lines?.length === 0 && (
          <Alert className="bg-background/95 shadow-sm">
            <InfoIcon />
            <AlertDescription>
              <Link href={routes.dashboard} className="underline underline-offset-4">
                {t("empty")}
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

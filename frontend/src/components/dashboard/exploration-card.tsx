"use client";

import { ChevronRightIcon, CompassIcon, TrainFrontIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { searchOfModule } from "@/components/map/map-address";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { useCountries } from "@/hooks/use-countries";
import { useStations } from "@/hooks/use-stations";
import { useTileStats } from "@/hooks/use-tile-stats";
import type { CountryCompletion, TileLevelStats, VisitedStations } from "@/lib/api/types";
import { countryFlag, countryName, percentDecimals } from "@/lib/countries/country-format";

/** Countries listed, the most visited first. */
const SHOWN_COUNTRIES = 6;

/**
 * Tiles explored on both levels, train stations and railway unlocked, the
 * most visited countries and a preview of the map; `version` refreshes them
 * while the tiles are computed.
 */
export function ExplorationCard({ version }: { version: string }) {
  const t = useTranslations("dashboard.exploration");
  const format = useFormatter();
  const { stats, error: tilesError } = useTileStats(version);
  const { completion, error: countriesError } = useCountries(version);
  const { stations, error: stationsError } = useStations(version);

  return (
    <Card className="lg:row-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <CompassIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={routes.map} />}>
            {t("map")}
            <ChevronRightIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {tilesError && !stats ? (
          <p className="text-sm text-muted-foreground">{t("tilesError")}</p>
        ) : (
          <Link
            href={`${routes.map}${searchOfModule("tiles")}`}
            title={t("openTiles")}
            // Dark whatever the theme, as the header of the page.
            className="flex flex-col gap-3 rounded-xl bg-linear-to-br from-zinc-800 to-zinc-950 py-3 text-zinc-50 ring-1 ring-white/10 outline-none transition-[box-shadow,translate] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            <div className="grid grid-cols-2 divide-x divide-white/10">
              <TileLevel title={t("tiles")} stats={stats?.tiles ?? null} />
              <TileLevel title={t("subtiles")} stats={stats?.subtiles ?? null} />
            </div>
            {stats && stats.tiles.visited > 0 && <MapPreview key={version} version={version} />}
          </Link>
        )}
        {stationsError ? (
          <p className="text-sm text-muted-foreground">{t("stationsError")}</p>
        ) : (
          <StationsSummary stations={stations} />
        )}
        <div className="flex flex-col gap-3">
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{t("countries")}</span>
            {completion && completion.countries.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("countriesCount", { count: completion.countries.length, formatted: format.number(completion.countries.length) })}
              </span>
            )}
          </p>
          {countriesError && !completion ? (
            <p className="text-sm text-muted-foreground">{t("countriesError")}</p>
          ) : !completion ? (
            <div className="flex flex-col gap-3" aria-busy>
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-8" />
              ))}
            </div>
          ) : completion.countries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {completion.pendingTiles > 0 ? t("countriesPending") : t("countriesEmpty")}
            </p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {completion.countries.slice(0, SHOWN_COUNTRIES).map((country) => (
                <CountryRow key={country.code} country={country} />
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Image of the area where the most tiles were explored, drawn by the server
 * in the theme of the map, under the counters of the tiles; hidden if it
 * fails to load.
 */
function MapPreview({ version }: { version: string }) {
  const t = useTranslations("dashboard.exploration");
  const { resolvedTheme } = useTheme();
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  if (state === "failed") {
    return null;
  }
  return (
    <div className="relative mx-3 aspect-5/3 overflow-hidden rounded-lg ring-1 ring-white/10">
      {state === "loading" && <Skeleton className="absolute inset-0 rounded-none bg-white/10" />}
      {resolvedTheme && (
        // Drawn and cached by the API: nothing for the image optimizer to do.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/tiles/preview?theme=${theme}&v=${encodeURIComponent(version)}`}
          alt={t("preview")}
          width={800}
          height={480}
          className="size-full object-cover"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
        />
      )}
    </div>
  );
}

/** Tiles explored at one level, with its largest square and cluster. */
function TileLevel({ title, stats }: { title: string; stats: TileLevelStats | null }) {
  const t = useTranslations("dashboard.exploration");
  const format = useFormatter();

  return (
    <div className="flex min-w-0 flex-col gap-1 px-3">
      <span className="flex items-center gap-1.5 truncate text-xs text-zinc-400">
        <span className="size-2 shrink-0 rounded-[2px] bg-green-500" aria-hidden />
        {title}
      </span>
      {stats === null ? (
        <Skeleton className="h-7 w-16 bg-white/10" />
      ) : (
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{format.number(stats.visited)}</span>
      )}
      <dl className="flex flex-col gap-0.5 text-xs text-zinc-400">
        <div className="flex justify-between gap-2">
          <dt className="truncate">{t("maxSquare")}</dt>
          <dd className="shrink-0 font-medium text-zinc-100 tabular-nums">
            {stats ? t("squareSize", { size: stats.maxSquare }) : "–"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="truncate">{t("maxCluster")}</dt>
          <dd className="shrink-0 font-medium text-zinc-100 tabular-nums">
            {stats ? format.number(stats.maxCluster) : "–"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Train stations visited, railway unlocked between them and the latest station reached. */
function StationsSummary({ stations }: { stations: VisitedStations | null }) {
  const t = useTranslations("dashboard.exploration");
  const format = useFormatter();
  const railwayM = stations?.links.reduce((total, link) => total + link.lengthM, 0) ?? 0;
  const latest = stations?.stations.reduce<VisitedStations["stations"][number] | null>(
    (last, station) =>
      station.firstVisitAt && (!last?.firstVisitAt || station.firstVisitAt > last.firstVisitAt) ? station : last,
    null,
  );

  return (
    <Link
      href={`${routes.map}${searchOfModule("stations")}`}
      title={t("openStations")}
      // The violet of the stations and the railway on the map.
      className="flex flex-col gap-2 rounded-xl bg-linear-to-br from-violet-600 to-violet-800 p-3 text-white ring-1 ring-violet-900/20 outline-none transition-[box-shadow,translate] hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
    >
      <span className="flex items-center gap-1.5 text-xs text-violet-200">
        <TrainFrontIcon className="size-3.5" aria-hidden />
        {t("stations")}
      </span>
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        {stations ? (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {format.number(stations.stations.length)}
              </span>
              <span className="text-xs text-violet-200">
                {t("stationCount", { count: stations.stations.length })}
              </span>
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {format.number(railwayM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-violet-200">{t("railway")}</span>
            </p>
          </>
        ) : (
          <Skeleton className="h-8 w-40 bg-white/15" />
        )}
      </div>
      {latest?.name && <p className="truncate text-xs text-violet-200">{t("lastStation", { name: latest.name })}</p>}
    </Link>
  );
}

/** A visited country and its share of large tiles explored, opening its sector on the map. */
function CountryRow({ country }: { country: CountryCompletion }) {
  const t = useTranslations("dashboard.exploration");
  const format = useFormatter();
  const locale = useLocale();
  const { visited, total } = country.tiles;
  const share = total ? visited / total : null;
  const decimals = share === null ? 0 : percentDecimals(share);

  return (
    <li>
      <Link
        href={`${routes.map}?sector=${country.code}`}
        className="flex flex-col gap-1.5 rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>{countryFlag(country.code)}</span>
          <span className="min-w-0 flex-1 truncate">{countryName(country.code, locale)}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {t("countryTiles", { visited: format.number(visited) })}
          </span>
          <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums">
            {share === null
              ? "…"
              : format.number(share, { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          </span>
        </span>
        <span className="h-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-green-600 dark:bg-green-500"
            // A sliver even for the tiniest share, so that every country shows its bar.
            style={{ width: `${share === null ? 0 : Math.max(share * 100, 1)}%` }}
          />
        </span>
      </Link>
    </li>
  );
}

"use client";

import { GlobeIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountries } from "@/hooks/use-countries";
import type { CountryCompletion, CountryLevelCompletion } from "@/lib/api/types";
import { countryFlag, countryName, percentDecimals } from "@/lib/countries/country-format";

/** Tile completion of each visited country; `version` refreshes it while the tiles are computed. */
export function CountryStats({ version }: { version: string }) {
  const t = useTranslations("dashboard.countries");
  const format = useFormatter();
  const { completion, error } = useCountries(version);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <GlobeIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("title")}
        </CardTitle>
        {completion && completion.pendingTiles > 0 && (
          <CardDescription>
            {t("locating", { count: completion.pendingTiles, formatted: format.number(completion.pendingTiles) })}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {error && !completion ? (
          <p className="text-sm text-muted-foreground">{t("error")}</p>
        ) : !completion ? (
          <CountryListSkeleton />
        ) : completion.countries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{completion.pendingTiles > 0 ? t("pending") : t("empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {completion.countries.map((country) => (
              <CountryRow key={country.code} country={country} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CountryRow({ country }: { country: CountryCompletion }) {
  const t = useTranslations("dashboard.countries");
  const locale = useLocale();

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <p className="flex items-center gap-2 font-medium">
        <span aria-hidden>{countryFlag(country.code)}</span>
        {countryName(country.code, locale)}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
        <LevelCompletion label={t("tiles")} level={country.tiles} />
        <LevelCompletion label={t("subtiles")} level={country.subtiles} />
      </div>
    </li>
  );
}

function LevelCompletion({ label, level }: { label: string; level: CountryLevelCompletion }) {
  const t = useTranslations("dashboard.countries");
  const format = useFormatter();
  const share = level.total ? level.visited / level.total : null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        {share === null ? (
          <Skeleton className="h-4 w-14" />
        ) : (
          <span className="font-semibold tabular-nums">
            {format.number(share, {
              style: "percent",
              minimumFractionDigits: percentDecimals(share),
              maximumFractionDigits: percentDecimals(share),
            })}
          </span>
        )}
      </div>
      <Progress value={share === null ? null : share * 100} aria-label={label} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {level.total === null
          ? t("computingTotal", { visited: format.number(level.visited) })
          : t("count", { visited: format.number(level.visited), total: format.number(level.total) })}
      </p>
    </div>
  );
}

function CountryListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

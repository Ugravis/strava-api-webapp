"use client";

import { CircleAlertIcon, ContrastIcon, FocusIcon, LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Button } from "@kilotrace/ui/components/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@kilotrace/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kilotrace/ui/components/tooltip";
import type { CountryLevelCompletion, CountrySector } from "@/lib/api/types";
import { countryFlag, countryName, percentDecimals } from "@/lib/countries/country-format";
import { cn } from "@/lib/utils";
import { accentStyle, type MapColor } from "./map-keys";
import { ValueSkeleton } from "./map-stat";

interface SectorBandProps {
  /** Code of the country picked, known before its details; null while the center of the map is at sea. */
  code: string | null;
  /** Null while loading. */
  sector: CountrySector | null;
  error: boolean;
  /** Whether the small tiles are drawn: their completion is shown with them. */
  subtiles: boolean;
  /** Whether the map is dimmed around the sector. */
  veil: boolean;
  onVeilChange: (veil: boolean) => void;
  onSearch: () => void;
  onRecenter: () => void;
  onClose: () => void;
}

/** A section of the band, separated from the others by a line, like those of the band of the key figures. */
const SECTION = "flex items-center px-4 py-3";

/**
 * Band of the sector tool, over the band of the key figures: the sector
 * picked, the tiles of the user in it out of its total, the train stations
 * visited and the railway unlocked out of its network, each with a bar of
 * its completion, their first and
 * latest visits, and buttons
 * to search for another sector or frame this one again. Stacked on narrow
 * screens, in a row on larger ones.
 */
export function SectorBand({ code, sector, error, subtiles, veil, onVeilChange, onSearch, onRecenter, onClose }: SectorBandProps) {
  const t = useTranslations("map.sector");
  const format = useFormatter();
  const locale = useLocale();
  const computing = sector !== null && sector.shapeVersion === null;
  const visit = (at: string | null | undefined) =>
    at === undefined ? <Skeleton className="h-3.5 w-20" /> : at === null ? t("never") : format.dateTime(new Date(at), { dateStyle: "medium" });
  const status = error ? (
    <span className="flex items-center gap-1.5 text-destructive">
      <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
      {t("error")}
    </span>
  ) : computing ? (
    <span className="flex items-center gap-1.5">
      <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" aria-hidden />
      {t("computing")}
    </span>
  ) : null;
  // Icon-only buttons: their name shows in a tooltip.
  const recenterButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant="outline"
            onClick={onRecenter}
            disabled={!sector?.bounds}
            aria-label={t("recenter")}
          />
        }
      >
        <FocusIcon />
      </TooltipTrigger>
      <TooltipContent>{t("recenter")}</TooltipContent>
    </Tooltip>
  );
  const veilButton = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-sm"
            variant={veil ? "secondary" : "outline"}
            onClick={() => onVeilChange(!veil)}
            aria-pressed={veil}
            aria-label={t("veil")}
          />
        }
      >
        <ContrastIcon />
      </TooltipTrigger>
      <TooltipContent>{t("veil")}</TooltipContent>
    </Tooltip>
  );
  const closeButton = (className: string) => (
    <Button size="icon-sm" variant="ghost" className={className} onClick={onClose} aria-label={t("close")} title={t("close")}>
      <XIcon />
    </Button>
  );

  // The center of the map is at sea and no sector was shown before.
  if (code === null) {
    return (
      <section
        aria-label={t("label")}
        className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-4 py-3 md:min-h-22.5"
      >
        <p className="min-w-0 text-sm text-muted-foreground">{t("atSea")}</p>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" onClick={onSearch}>
            <SearchIcon />
            {t("search.title")}
          </Button>
          {closeButton("")}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={t("label")}
      // As tall as the band of the history tool, its slider and labels included.
      className="flex shrink-0 flex-col divide-y border-t bg-background md:min-h-22.5 md:flex-row md:divide-x md:divide-y-0"
    >
      <div className={cn(SECTION, "min-w-0 justify-between gap-2 md:max-w-80 md:shrink-0")}>
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span aria-hidden className="text-lg leading-none">
            {countryFlag(code)}
          </span>
          <span className="truncate">{countryName(code, locale)}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" variant="outline" onClick={onSearch}>
            <SearchIcon />
            {t("change")}
          </Button>
          {recenterButton}
          {veilButton}
          {closeButton("md:hidden")}
        </div>
      </div>

      {/* Scrolling sideways where the four figures do not fit. */}
      <div className={cn(SECTION, "min-w-0 gap-8 overflow-x-auto scrollbar-none *:shrink-0 md:flex-1 md:justify-center-safe")}>
        <CompletionStat label={t("tiles")} accent="tile" completion={levelCompletion(sector?.tiles)} />
        {subtiles && (
          <CompletionStat
            label={t("subtiles")}
            accent="subtile"
            completion={levelCompletion(sector?.subtiles)}
          />
        )}
        {/* Hidden once loaded for a country without stations. */}
        {(!sector || sector.stations) && (
          <CompletionStat
            label={t("stations")}
            accent="station"
            completion={sector?.stations ? { ...sector.stations, unit: null } : undefined}
          />
        )}
        {/* Hidden once loaded for a country without railway. */}
        {(!sector || sector.railway) && (
          <CompletionStat
            label={t("railway")}
            accent="railLink"
            completion={
              sector?.railway
                ? { visited: sector.railway.unlockedM / 1000, total: sector.railway.totalM / 1000, unit: "kilometer" }
                : undefined
            }
          />
        )}
      </div>

      {/* Two short lines, as tall as the figures. */}
      <div className={cn(SECTION, "shrink-0")}>
        <dl className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5 text-xs whitespace-nowrap">
          <dt className="text-muted-foreground">{t("firstVisit")}</dt>
          <dd className="font-medium tabular-nums">{visit(sector?.firstVisitAt)}</dd>
          <dt className="text-muted-foreground">{t("lastVisit")}</dt>
          <dd className="font-medium tabular-nums">{visit(sector?.lastVisitAt)}</dd>
        </dl>
      </div>

      {/* On narrow screens, only while there is something to tell. */}
      <div className={cn(SECTION, "gap-2 md:pr-3", !status && "max-md:hidden md:pl-3")}>
        <div role="status" className="flex min-w-0 flex-1 items-center text-xs text-muted-foreground md:max-w-64">
          {status}
        </div>
        {closeButton("hidden md:inline-flex")}
      </div>
    </section>
  );
}

/** Done out of the total of a sector, in kilometers or a count; the total may still be computed. */
interface SectorCompletion {
  visited: number;
  total: number | null;
  unit: "kilometer" | null;
}

/** Completion of one level of tiles; undefined while loading. */
function levelCompletion(level: CountryLevelCompletion | undefined): SectorCompletion | undefined {
  return level && { ...level, unit: null };
}

/**
 * Done out of the total of the sector under its label and the share
 * completed, over a bar of its completion in the color of what it counts on
 * the map; the total may still be computed.
 */
function CompletionStat({
  label,
  accent,
  completion,
}: {
  label: string;
  accent: MapColor;
  /** Undefined while loading. */
  completion: SectorCompletion | undefined;
}) {
  const t = useTranslations("map.sector");
  const format = useFormatter();
  const share = completion?.total ? completion.visited / completion.total : null;
  const number = (value: number) => format.number(value, { maximumFractionDigits: 0 });

  return (
    <div className="flex min-w-32 flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-xs leading-4 whitespace-nowrap text-muted-foreground">
        {label}
        {share !== null && (
          <span className="font-medium text-foreground tabular-nums">
            {format.number(share, {
              style: "percent",
              minimumFractionDigits: percentDecimals(share),
              maximumFractionDigits: percentDecimals(share),
            })}
          </span>
        )}
      </span>
      {completion ? (
        <span className="h-4 text-base leading-none font-semibold tracking-tight whitespace-nowrap tabular-nums">
          {number(completion.visited)}
          <span className="text-xs font-normal tracking-normal text-muted-foreground">
            {" / "}
            {completion.total === null
              ? t("computingTotal")
              : completion.unit
                ? format.number(completion.total, { style: "unit", unit: completion.unit, maximumFractionDigits: 0 })
                : number(completion.total)}
          </span>
        </span>
      ) : (
        <ValueSkeleton />
      )}
      {/* In the color of what it counts on the map. */}
      <Progress
        value={share === null ? 0 : Math.min(100, share * 100)}
        aria-label={label}
        style={accentStyle(accent)}
        className="**:data-[slot=progress-indicator]:bg-accent dark:**:data-[slot=progress-indicator]:bg-(--accent-dark)"
      />
    </div>
  );
}

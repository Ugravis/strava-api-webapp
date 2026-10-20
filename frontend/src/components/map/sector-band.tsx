"use client";

import { CircleAlertIcon, ContrastIcon, FocusIcon, LoaderCircleIcon, SearchIcon, XIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CountryLevelCompletion, CountryRailway, CountrySector, CountryStations } from "@/lib/api/types";
import { countryFlag, countryName, percentDecimals } from "@/lib/countries/country-format";
import { cn } from "@/lib/utils";
import { RailKey, StationKey, TileKey } from "./map-keys";
import { Stat, ValueSkeleton } from "./map-stat";

interface SectorBandProps {
  /** Code of the country picked, known before its details. */
  code: string;
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
const SECTION = "flex items-center px-4 py-3 md:px-6";

/**
 * Band of the sector tool, over the band of the key figures: the sector
 * picked, the tiles of the user in it out of its total, the train stations
 * visited and the railway unlocked out of its network, their first and
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
    at === undefined ? <ValueSkeleton /> : at === null ? t("never") : format.dateTime(new Date(at), { dateStyle: "medium" });
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

  return (
    <section
      aria-label={t("label")}
      className="flex shrink-0 flex-col divide-y border-t bg-background md:flex-row md:divide-x md:divide-y-0"
    >
      <div className={cn(SECTION, "min-w-0 justify-between gap-2")}>
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

      {/* Scrolling sideways on narrow screens, where four figures do not fit. */}
      <div
        className={cn(
          SECTION,
          "gap-6 overflow-x-auto scrollbar-none *:shrink-0 md:flex-1 md:justify-center md:overflow-visible",
        )}
      >
        <Stat
          value={<Completion level={sector?.tiles} />}
          label={t("tiles")}
          colorKey={<TileKey />}
        />
        {subtiles && (
          <Stat
            value={<Completion level={sector?.subtiles} />}
            label={t("subtiles")}
            colorKey={<TileKey subtiles />}
          />
        )}
        {/* Hidden once loaded for a country without stations. */}
        {(!sector || sector.stations) && (
          <Stat
            value={sector?.stations ? <StationsCompletion stations={sector.stations} /> : <ValueSkeleton />}
            label={t("stations")}
            colorKey={<StationKey />}
          />
        )}
        {/* Hidden once loaded for a country without railway. */}
        {(!sector || sector.railway) && (
          <Stat
            value={sector?.railway ? <RailwayCompletion railway={sector.railway} /> : <ValueSkeleton />}
            label={t("railway")}
            colorKey={<RailKey />}
          />
        )}
      </div>

      <div className={cn(SECTION, "gap-6")}>
        <Stat value={visit(sector?.firstVisitAt)} label={t("firstVisit")} colorKey={null} />
        <Stat value={visit(sector?.lastVisitAt)} label={t("lastVisit")} colorKey={null} />
      </div>

      {/* On narrow screens, only while there is something to tell. */}
      <div className={cn(SECTION, "gap-2", !status && "max-md:hidden")}>
        <div role="status" className="flex min-w-0 flex-1 items-center text-xs text-muted-foreground md:max-w-64">
          {status}
        </div>
        {closeButton("hidden md:inline-flex")}
      </div>
    </section>
  );
}

/** Train stations visited out of those of the country, and the share. */
function StationsCompletion({ stations: { visited, total } }: { stations: CountryStations }): ReactNode {
  const format = useFormatter();
  const share = visited / total;
  return (
    <>
      {format.number(visited)}
      <span className="text-xs font-normal text-muted-foreground">
        {" / "}
        {format.number(total)}
      </span>
      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
        {format.number(share, {
          style: "percent",
          minimumFractionDigits: percentDecimals(share),
          maximumFractionDigits: percentDecimals(share),
        })}
      </span>
    </>
  );
}

/** Kilometers of railway unlocked out of the network of the country, and the share. */
function RailwayCompletion({ railway: { unlockedM, totalM } }: { railway: CountryRailway }): ReactNode {
  const format = useFormatter();
  const share = totalM > 0 ? unlockedM / totalM : 0;
  const km = (meters: number) => format.number(meters / 1000, { maximumFractionDigits: 0 });
  return (
    <>
      {km(unlockedM)}
      <span className="text-xs font-normal text-muted-foreground">
        {" / "}
        {format.number(totalM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 })}
      </span>
      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
        {format.number(share, {
          style: "percent",
          minimumFractionDigits: percentDecimals(share),
          maximumFractionDigits: percentDecimals(share),
        })}
      </span>
    </>
  );
}

/** Tiles of one level visited out of the total, and the share completed; the total may still be computed. */
function Completion({ level }: { level: CountryLevelCompletion | undefined }): ReactNode {
  const t = useTranslations("map.sector");
  const format = useFormatter();
  if (!level) return <ValueSkeleton />;
  const { visited, total } = level;
  const share = total ? visited / total : null;
  return (
    <>
      {format.number(visited)}
      <span className="text-xs font-normal text-muted-foreground">
        {" / "}
        {total === null ? t("computingTotal") : format.number(total)}
      </span>
      {share !== null && (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          {format.number(share, {
            style: "percent",
            minimumFractionDigits: percentDecimals(share),
            maximumFractionDigits: percentDecimals(share),
          })}
        </span>
      )}
    </>
  );
}

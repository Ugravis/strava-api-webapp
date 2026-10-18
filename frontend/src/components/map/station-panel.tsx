"use client";

import { CheckIcon, ChevronRightIcon, CircleDashedIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStation } from "@/hooks/use-station";
import type { StationDetails, StationNeighbor } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { PanelFigure, PanelFiguresSkeleton } from "./panel-figure";
import type { StationPick } from "./stations-layer";
import type { TileRef } from "./tile-highlight";
import { TileActivityList } from "./tile-activity-list";

const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

interface StationPanelProps {
  stationId: number;
  /** Called once the station is known, to ring it on the map and center it. */
  onLocated: (station: StationPick) => void;
  onOpenStation: (station: StationPick) => void;
  onOpenTile: (tile: TileRef) => void;
  onOpenActivity: (activityId: string) => void;
}

/**
 * Content of the panel for a train station: whether its small tile was
 * visited, its neighbors on the railway with the links unlocked, and the
 * activities that crossed its small tile.
 */
export function StationPanel({ stationId, onLocated, onOpenStation, onOpenTile, onOpenActivity }: StationPanelProps) {
  const t = useTranslations("map.stationPanel");
  const format = useFormatter();
  const { station, error } = useStation(stationId);
  // Called once per station: the callback changes with every render of the map.
  const onLocatedRef = useRef(onLocated);

  useEffect(() => {
    onLocatedRef.current = onLocated;
  });

  useEffect(() => {
    if (station) onLocatedRef.current({ id: station.id, lon: station.lon, lat: station.lat });
  }, [station]);

  if (error) return <p className="text-muted-foreground">{t("error")}</p>;
  if (!station) return <StationPanelSkeleton />;

  const unlocked = station.neighbors?.filter((neighbor) => station.visited && neighbor.visited).length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg leading-tight font-semibold">{station.name ?? t("unnamed")}</h2>
        <div>
          <Badge variant={station.visited ? "default" : "outline"}>{station.visited ? t("visited") : t("notVisited")}</Badge>
        </div>
        <p className="text-muted-foreground">{station.visited ? t("visitedDescription") : t("notVisitedDescription")}</p>
      </header>

      {(station.firstVisitAt || station.neighbors) && (
        <dl className="grid grid-cols-3 gap-3">
          {station.firstVisitAt && (
            <PanelFigure
              label={t("firstVisit")}
              value={format.dateTime(new Date(station.firstVisitAt), { dateStyle: "medium" })}
            />
          )}
          {station.neighbors && (
            <PanelFigure label={t("links")} value={`${unlocked} / ${station.neighbors.length}`} />
          )}
        </dl>
      )}

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("neighbors")}</h3>
        <NeighborList station={station} onOpenStation={onOpenStation} />
      </section>

      <section className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("activities")}</h3>
          <Button variant="outline" size="xs" onClick={() => onOpenTile(station.tile)}>
            {t("viewTile")}
            <ChevronRightIcon data-icon="inline-end" aria-hidden />
          </Button>
        </div>
        <TileActivityList {...station.tile} onOpenActivity={onOpenActivity} />
      </section>

      <p className="text-xs text-muted-foreground">
        {t.rich("attribution", {
          link: (chunks) => (
            <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}

function NeighborList({
  station,
  onOpenStation,
}: {
  station: StationDetails;
  onOpenStation: (station: StationPick) => void;
}) {
  const t = useTranslations("map.stationPanel");
  const format = useFormatter();

  if (!station.neighbors) {
    return <p className="text-muted-foreground">{station.visited ? t("linksPending") : t("linksUnknown")}</p>;
  }
  if (station.neighbors.length === 0) return <p className="text-muted-foreground">{t("noNeighbors")}</p>;

  const distance = ({ lengthM }: StationNeighbor) =>
    format.number(lengthM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: lengthM < 10_000 ? 1 : 0 });

  return (
    <ul className="flex flex-col divide-y">
      {station.neighbors.map((neighbor) => {
        const linked = station.visited && neighbor.visited;
        return (
          <li key={neighbor.id}>
            <button
              type="button"
              onClick={() => onOpenStation({ id: neighbor.id, lon: neighbor.lon, lat: neighbor.lat })}
              className={cn(
                "flex w-full items-center gap-2.5 py-2.5 text-left",
                "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
              )}
            >
              {neighbor.visited ? (
                <CheckIcon className="size-4 shrink-0 text-primary" aria-label={t("visited")} />
              ) : (
                <CircleDashedIcon className="size-4 shrink-0 text-muted-foreground" aria-label={t("notVisited")} />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{neighbor.name ?? t("unnamed")}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {linked ? t("linkUnlocked", { distance: distance(neighbor) }) : distance(neighbor)}
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function StationPanelSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
      </div>
      <PanelFiguresSkeleton count={2} />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

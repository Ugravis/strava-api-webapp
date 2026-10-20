"use client";

import { ChevronDownIcon, ChevronRightIcon, CrosshairIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REAL_TRAIN_SPEED, useTrainSpeed } from "@/lib/trains/train-speed";
import { cn } from "@/lib/utils";
import { PanelFigure } from "./panel-figure";
import type { LinkEnd, StationPick } from "./stations-layer";
import type { TrainInfo, TrainStop } from "./train-traffic";

/** The figures of a train change as it runs: read again a few times a second. */
const REFRESH_MS = 500;

interface TrainPanelProps {
  trainId: number;
  /** The train as it runs now; null once it has left the map. */
  getInfo: (trainId: number) => TrainInfo | null;
  onFollowChange: (following: boolean) => void;
  onOpenStation: (station: StationPick) => void;
}

/**
 * Content of the panel for a train running on the map: where it comes from,
 * stops next and ends, its stops with their times, how fast, and made-up
 * figures such as its passengers. The camera follows it until the map is
 * dragged.
 */
export function TrainPanel({
  trainId,
  getInfo,
  onFollowChange,
  onOpenStation,
}: TrainPanelProps) {
  const t = useTranslations("map.trainPanel");
  const format = useFormatter();
  const [info, setInfo] = useState(() => getInfo(trainId));
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const factor = useTrainSpeed();

  useEffect(() => {
    const timer = setInterval(() => setInfo(getInfo(trainId)), REFRESH_MS);
    return () => clearInterval(timer);
  }, [getInfo, trainId]);

  if (!info) return <p className="text-muted-foreground">{t("gone")}</p>;

  const km = (metres: number) =>
    format.number(metres / 1000, {
      style: "unit",
      unit: "kilometer",
      maximumFractionDigits: metres < 10_000 ? 1 : 0,
    });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="text-lg leading-tight font-semibold">
          {t("title", { kind: t(`kinds.${info.kind}`), number: info.number })}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={info.dwelling ? "outline" : "default"}>
            {info.dwelling ? t("dwelling") : t("running")}
          </Badge>
          <Badge variant={info.delayMin > 0 ? "destructive" : "secondary"}>
            {info.delayMin > 0
              ? t("late", { minutes: info.delayMin })
              : t("onTime")}
          </Badge>
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-3">
        <PanelFigure
          label={t("speed")}
          value={
            factor === REAL_TRAIN_SPEED
              ? t("kmh", { speed: info.speedKmh })
              : `${t("kmh", { speed: info.speedKmh })} ${t("speedFactor", { factor })}`
          }
        />
        <PanelFigure label={t("remaining")} value={km(info.remainingM)} />
        <PanelFigure label={t("vehicles")} value={String(info.vehicles)} />
        {info.passengers !== null && info.seats !== null ? (
          <PanelFigure
            label={t("passengers")}
            value={`${info.passengers} / ${info.seats}`}
          />
        ) : (
          <>
            <PanelFigure
              label={t("cargo")}
              value={info.cargo ? t(`cargoes.${info.cargo}`) : t("goods")}
            />
            <PanelFigure
              label={t("load")}
              value={t("tonnes", { tonnes: info.tonnes ?? 0 })}
            />
          </>
        )}
        <PanelFigure label={t("onLine")} value={String(info.onLine)} />
      </dl>

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">
          {t("journey")}
        </h3>
        <ul className="flex flex-col divide-y">
          <StationRow
            label={t("from")}
            station={info.origin}
            onOpenStation={onOpenStation}
          />
          <StationRow
            label={t("next")}
            station={info.next}
            onOpenStation={onOpenStation}
          />
          <StationRow
            label={t("terminus")}
            station={info.terminus}
            onOpenStation={onOpenStation}
          />
        </ul>
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={itineraryOpen}
          aria-controls="train-itinerary"
          onClick={() => setItineraryOpen(!itineraryOpen)}
        >
          <ChevronDownIcon
            data-icon="inline-start"
            className={cn(
              "transition-transform",
              !itineraryOpen && "-rotate-90",
            )}
            aria-hidden
          />
          {t("itinerary", { count: info.stops.length })}
        </Button>
        {itineraryOpen && (
          <ol id="train-itinerary" className="flex flex-col">
            {info.stops.map((stop, index) => (
              <ItineraryStop
                // A loop passes its first station again at its end.
                key={`${stop.station.id}-${index}`}
                stop={stop}
                last={index === info.stops.length - 1}
                onOpenStation={onOpenStation}
              />
            ))}
          </ol>
        )}
      </section>

      <Button
        variant={info.following ? "secondary" : "outline"}
        size="sm"
        className="self-start"
        aria-pressed={info.following}
        onClick={() => {
          onFollowChange(!info.following);
          setInfo({ ...info, following: !info.following });
        }}
      >
        <CrosshairIcon data-icon="inline-start" aria-hidden />
        {info.following ? t("following") : t("follow")}
      </Button>

      <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}

function StationRow({
  label,
  station,
  onOpenStation,
}: {
  label: string;
  station: LinkEnd;
  onOpenStation: (station: StationPick) => void;
}) {
  const t = useTranslations("map.trainPanel");
  return (
    <li>
      <button
        type="button"
        onClick={() =>
          onOpenStation({ id: station.id, lon: station.lon, lat: station.lat })
        }
        className={cn(
          "flex w-full items-center gap-2.5 py-2.5 text-left",
          "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
        )}
      >
        <span className="w-20 shrink-0 text-xs text-muted-foreground">
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">
          {station.name ?? t("unnamed")}
        </span>
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    </li>
  );
}

/** A stop of the itinerary on its line: a dot filled once served, the time on the right. */
function ItineraryStop({
  stop,
  last,
  onOpenStation,
}: {
  stop: TrainStop;
  last: boolean;
  onOpenStation: (station: StationPick) => void;
}) {
  const t = useTranslations("map.trainPanel");
  const format = useFormatter();
  const { station, passed } = stop;
  return (
    <li className="relative">
      {!last && (
        <span
          className={cn(
            "absolute top-1/2 left-[0.3125rem] h-full w-0.5",
            passed ? "bg-primary" : "bg-border",
          )}
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={() =>
          onOpenStation({ id: station.id, lon: station.lon, lat: station.lat })
        }
        className={cn(
          "relative flex w-full items-center gap-2.5 py-1.5 text-left",
          "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
        )}
      >
        <span
          className={cn(
            "size-3 shrink-0 rounded-full border-2 border-primary",
            passed ? "bg-primary" : "bg-background",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            passed && "text-muted-foreground",
          )}
        >
          {station.name ?? t("unnamed")}
        </span>
        <time
          dateTime={new Date(stop.time).toISOString()}
          title={passed ? t("passed") : t("estimated")}
          className={cn(
            "shrink-0 text-xs tabular-nums",
            passed ? "text-muted-foreground" : "font-medium",
          )}
        >
          {format.dateTime(stop.time, { hour: "2-digit", minute: "2-digit" })}
        </time>
      </button>
    </li>
  );
}

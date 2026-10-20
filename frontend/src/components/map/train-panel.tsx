"use client";

import { ChevronDownIcon, CrosshairIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { REAL_TRAIN_SPEED, useTrainSpeed } from "@/lib/trains/train-speed";
import { cn } from "@/lib/utils";
import { PanelFigure } from "./panel-figure";
import type { StationPick } from "./stations-layer";
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
 * Content of the panel for a train running on the map: its journey, from
 * where it comes from to where it ends, through its next stop, with times, how fast, and made-up
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
  const [allStops, setAllStops] = useState(false);
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
          {t("journey", { count: info.stops.length })}
        </h3>
        <ol className="flex flex-col">
          {journey(info, allStops).map((row, index, rows) =>
            !("stop" in row) ? (
              <HiddenStops
                key={`hidden-${index}`}
                count={row.hidden}
                passed={row.passed}
                onShow={() => setAllStops(true)}
              />
            ) : (
              <JourneyStop
                // A loop passes its first station again at its end.
                key={`${row.stop.station.id}-${row.index}`}
                stop={row.stop}
                label={row.label}
                last={index === rows.length - 1}
                onOpenStation={onOpenStation}
              />
            ),
          )}
        </ol>
        {allStops && info.stops.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setAllStops(false)}
          >
            <ChevronDownIcon
              data-icon="inline-start"
              className="rotate-180"
              aria-hidden
            />
            {t("fewerStops")}
          </Button>
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

type JourneyRow =
  | {
      hidden: 0;
      stop: TrainStop;
      index: number;
      label?: "from" | "next" | "terminus";
    }
  | { hidden: number; passed: boolean };

/**
 * The rows of the journey: every stop, or only the origin, the next stop and
 * the terminus, the stops between them folded into a count.
 */
function journey(info: TrainInfo, all: boolean): JourneyRow[] {
  const { stops } = info;
  const last = stops.length - 1;
  const next = Math.max(
    0,
    stops.findIndex((stop) => !stop.passed),
  );
  const label = (index: number) =>
    index === 0
      ? "from"
      : index === last
        ? "terminus"
        : index === next
          ? "next"
          : undefined;
  const rows: JourneyRow[] = [];
  let hidden = 0;
  stops.forEach((stop, index) => {
    const shown = all || index === 0 || index === next || index === last;
    if (!shown) {
      hidden++;
      return;
    }
    if (hidden > 0) rows.push({ hidden, passed: stop.passed });
    hidden = 0;
    rows.push({ hidden: 0, stop, index, label: label(index) });
  });
  return rows;
}

/** Stops folded between two shown ones: a click shows them all. */
function HiddenStops({
  count,
  passed,
  onShow,
}: {
  count: number;
  passed: boolean;
  onShow: () => void;
}) {
  const t = useTranslations("map.trainPanel");
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute inset-y-0 left-[0.3125rem] w-0.5",
          passed ? "bg-primary" : "bg-border",
        )}
        aria-hidden
      />
      <button
        type="button"
        onClick={onShow}
        className={cn(
          "relative flex w-full items-center gap-2.5 py-1 pl-[1.375rem] text-left text-xs text-muted-foreground",
          "hover:text-foreground focus-visible:text-foreground focus-visible:outline-none",
        )}
      >
        <ChevronDownIcon className="size-3.5" aria-hidden />
        {t("moreStops", { count })}
      </button>
    </li>
  );
}

/**
 * A stop of the journey on its line: a dot filled once served, the time on
 * the right, and whether it is the origin, the next stop or the terminus.
 */
function JourneyStop({
  stop,
  label,
  last,
  onOpenStation,
}: {
  stop: TrainStop;
  label?: "from" | "next" | "terminus";
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
        <span className="flex min-w-0 flex-1 flex-col">
          {label && (
            <span className="text-xs text-muted-foreground">{t(label)}</span>
          )}
          <span
            className={cn(
              "truncate",
              passed && !label && "text-muted-foreground",
              label && "font-medium",
            )}
          >
            {station.name ?? t("unnamed")}
          </span>
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

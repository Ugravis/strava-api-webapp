"use client";

import { CalendarIcon, CircleAlertIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { HistoryMode, TileHistorySummary } from "@/lib/api/types";
import {
  dayAtStep,
  dayOf,
  HISTORY_STEPS,
  type HistorySettings,
  type HistoryStep,
  stepDay,
} from "@/lib/tiles/history-period";
import { cn } from "@/lib/utils";
import type { MapColor } from "./map-keys";
import { Stat, ValueSkeleton } from "./map-stat";

interface HistoryBandProps {
  settings: HistorySettings;
  onSettingsChange: (settings: HistorySettings) => void;
  onClose: () => void;
  /** Null while loading. */
  summary: TileHistorySummary | null;
  /** The summary shown answers a previous date or mode. */
  loading: boolean;
  error: boolean;
  /** Steps of the slider offered, from the first one. */
  stepCount: number;
  /** Local day, `yyyy-mm-dd`. */
  today: string;
  /** Whether the small tiles are drawn: their count is shown with them. */
  subtiles: boolean;
}

const MODES: HistoryMode[] = ["gained", "state"];
/** A section of the band, separated from the others by a line, like those of the band of the key figures. */
const SECTION = "flex items-center px-4 py-3 md:px-6";

/** Local midnight of `day`, for formatting. */
function dateOf(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/**
 * Band of the history tool, over the band of the key figures: the mode, the
 * day picked on a slider counting back from today or entered manually, and
 * the counts of the tiles drawn and of the train stations and railway of
 * the same period. Stacked on narrow screens, in a row on
 * larger ones.
 */
export function HistoryBand({
  settings,
  onSettingsChange,
  onClose,
  summary,
  loading,
  error,
  stepCount,
  today,
  subtiles,
}: HistoryBandProps) {
  const t = useTranslations("map.history");
  const format = useFormatter();
  const { mode, date } = settings;
  const stepLabel = (step: HistoryStep) => t(`steps.${step.unit}`, { count: step.count });
  const firstDay = summary?.firstVisitAt ? dayOf(new Date(summary.firstVisitAt)) : undefined;
  // A day entered manually leaves the thumb on the step reaching back to it.
  const shownStep =
    date.step ??
    Math.max(
      0,
      HISTORY_STEPS.slice(0, stepCount).findLastIndex((step) => stepDay(step, today) >= date.day),
    );
  const formattedDay = format.dateTime(dateOf(date.day), { dateStyle: "medium" });
  const lastStep = Math.max(0, stepCount - 1);
  const pickerRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      // Without a picker to open, the field takes the keyboard.
      picker.focus();
    }
  };
  const counted = (value: number, formatted = (count: number) => format.number(count)) =>
    summary ? <span className={cn(loading && "opacity-50")}>{formatted(value)}</span> : <ValueSkeleton />;
  const accent = (small: boolean): MapColor =>
    mode === "gained" ? (small ? "activitySubtile" : "activityTile") : small ? "subtile" : "tile";

  return (
    <section
      aria-label={t("label")}
      className="flex shrink-0 flex-col divide-y border-t bg-background md:flex-row md:divide-x md:divide-y-0"
    >
      <div className={cn(SECTION, "justify-between gap-2")}>
        <ToggleGroup
          aria-label={t("mode")}
          variant="outline"
          size="sm"
          spacing={0}
          value={[mode]}
          onValueChange={([pressed]) => {
            // The pressed mode stays pressed: one of them is always shown.
            const next = MODES.find((value) => value === pressed);
            if (next) onSettingsChange({ ...settings, mode: next });
          }}
        >
          {MODES.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {t(`modes.${value}`)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button size="icon-sm" variant="ghost" className="md:hidden" onClick={onClose} aria-label={t("close")} title={t("close")}>
          <XIcon />
        </Button>
      </div>

      <div className={cn(SECTION, "min-w-0 flex-1 flex-col items-stretch justify-center gap-2 md:min-w-64")}>
        <div className="flex items-center gap-1 text-xs font-medium whitespace-nowrap">
          <span>
            {t.rich(mode === "gained" ? "since" : "at", {
              day: formattedDay,
              date: (chunks) => (
                <span className="relative inline-flex">
                  <button
                    type="button"
                    onClick={openPicker}
                    aria-label={t("editDay", { day: formattedDay })}
                    className="inline-flex items-center gap-1 rounded-sm underline decoration-dotted underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {chunks}
                    <CalendarIcon className="size-3.5" aria-hidden />
                  </button>
                  {/* Opened by the button: its native picker, the day shown in the language of the page. */}
                  <input
                    ref={pickerRef}
                    type="date"
                    tabIndex={-1}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0"
                    value={date.day}
                    min={firstDay}
                    max={today}
                    onChange={(event) => {
                      const day = event.target.value;
                      if (day && day <= today && (!firstDay || day >= firstDay)) {
                        onSettingsChange({ ...settings, date: { step: null, day } });
                      }
                    }}
                  />
                </span>
              ),
            })}
          </span>
          {date.step !== null && date.step > 0 && (
            <span className="text-muted-foreground">· {t("ago", { period: stepLabel(HISTORY_STEPS[date.step]) })}</span>
          )}
        </div>
        {/* Today on the right, the past to the left. */}
        <Slider
          className={cn("transition-opacity", date.step === null && "opacity-40 grayscale")}
          min={0}
          max={lastStep}
          step={1}
          value={[lastStep - shownStep]}
          disabled={stepCount <= 1}
          ticks
          rangeClassName="bg-blue-600 dark:bg-blue-500"
          thumbLabel={t("slider")}
          getAriaValueText={(_, value) => stepLabel(HISTORY_STEPS[lastStep - value])}
          onValueChange={(value) => {
            const index = lastStep - (Array.isArray(value) ? value[0] : value);
            if (index !== date.step) onSettingsChange({ ...settings, date: dayAtStep(index, stepCount, today) });
          }}
        />
        <div aria-hidden className="flex justify-between text-[0.7rem] text-muted-foreground">
          {stepCount > 1 && <span>{stepLabel(HISTORY_STEPS[lastStep])}</span>}
          <span className="ml-auto">{t("today")}</span>
        </div>
      </div>

      {/* Scrolling sideways where every count does not fit, the button closing the band kept in view. */}
      <div className={cn(SECTION, "min-w-0 gap-5 overflow-x-auto scrollbar-none *:shrink-0")}>
        {/* As wide as one another: every count weighs the same. */}
        <div className="grid auto-cols-fr grid-flow-col gap-6">
          <Stat value={counted(summary?.tiles ?? 0)} label={t("counts.tiles")} accent={accent(false)} />
          {subtiles && <Stat value={counted(summary?.subtiles ?? 0)} label={t("counts.subtiles")} accent={accent(true)} />}
          <Stat value={counted(summary?.stations ?? 0)} label={t("counts.stations")} accent="station" />
          <Stat
            value={counted(summary?.railwayM ?? 0, (meters) =>
              format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }),
            )}
            label={t("counts.railway")}
            accent="railLink"
          />
        </div>
        <div role="status" className="flex min-w-0 items-center text-xs text-muted-foreground">
          {error ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
              {t("error")}
            </span>
          ) : (
            summary &&
            !summary.upToDate && (
              <span className="flex items-center gap-1.5">
                <LoaderCircleIcon className="size-3.5 shrink-0 animate-spin" aria-hidden />
                {t("pending")}
              </span>
            )
          )}
        </div>
        <Button size="icon-sm" variant="ghost" className="sticky right-0 ml-auto hidden bg-background md:inline-flex" onClick={onClose} aria-label={t("close")} title={t("close")}>
          <XIcon />
        </Button>
      </div>
    </section>
  );
}

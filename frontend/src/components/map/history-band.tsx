"use client";

import { CircleAlertIcon, LoaderCircleIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { GainedKey, TileKey } from "./map-keys";
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

/** Local midnight of `day`, for formatting. */
function dateOf(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/**
 * Band of the history tool, over the band of the key figures: the mode, the
 * day picked on a slider counting back from today or entered manually, and
 * the counts of the tiles drawn. Stacked on narrow screens, in a row on
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
  const dateId = useId();
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
  const counted = (value: number) => (summary ? <span className={cn(loading && "opacity-50")}>{format.number(value)}</span> : <ValueSkeleton />);
  const colorKey = (small: boolean) => (mode === "gained" ? <GainedKey subtiles={small} /> : <TileKey subtiles={small} />);

  return (
    <section
      aria-label={t("label")}
      className="flex shrink-0 flex-col gap-3 border-t bg-background px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-6"
    >
      <div className="flex items-center justify-between gap-2">
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

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-medium">
            {t(mode === "gained" ? "since" : "at", { date: formattedDay })}
            {date.step !== null && <span className="text-muted-foreground"> · {t("ago", { period: stepLabel(HISTORY_STEPS[date.step]) })}</span>}
          </span>
          <label htmlFor={dateId} className="sr-only">
            {t("day")}
          </label>
          <Input
            id={dateId}
            type="date"
            className="h-7 w-auto shrink-0 px-2 text-xs md:text-xs"
            value={date.day}
            min={firstDay}
            max={today}
            onChange={(event) => {
              // Out of range while the year is being typed: kept until it is complete.
              const day = event.target.value;
              if (day && day <= today && (!firstDay || day >= firstDay)) {
                onSettingsChange({ ...settings, date: { step: null, day } });
              }
            }}
          />
        </div>
        <Slider
          className={cn(date.step === null && "opacity-60")}
          min={0}
          max={Math.max(0, stepCount - 1)}
          step={1}
          value={[shownStep]}
          disabled={stepCount <= 1}
          thumbLabel={t("slider")}
          getAriaValueText={(_, value) => stepLabel(HISTORY_STEPS[value])}
          onValueChange={(value) => {
            const index = Array.isArray(value) ? value[0] : value;
            if (index !== date.step) onSettingsChange({ ...settings, date: dayAtStep(index, stepCount, today) });
          }}
        />
        <div aria-hidden className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{stepLabel(HISTORY_STEPS[0])}</span>
          {stepCount > 1 && <span>{stepLabel(HISTORY_STEPS[stepCount - 1])}</span>}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <Stat value={counted(summary?.tiles ?? 0)} label={t(`counts.${mode}.tiles`)} colorKey={colorKey(false)} />
        {subtiles && <Stat value={counted(summary?.subtiles ?? 0)} label={t(`counts.${mode}.subtiles`)} colorKey={colorKey(true)} />}
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
        <Button size="icon-sm" variant="ghost" className="ml-auto hidden md:inline-flex" onClick={onClose} aria-label={t("close")} title={t("close")}>
          <XIcon />
        </Button>
      </div>
    </section>
  );
}

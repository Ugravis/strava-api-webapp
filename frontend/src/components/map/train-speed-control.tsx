"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  clampTrainSpeed,
  MAX_TRAIN_SPEED,
  MIN_TRAIN_SPEED,
  REAL_TRAIN_SPEED,
  setTrainSpeed,
  TRAIN_SPEED_STEPS,
  useTrainSpeed,
} from "@/lib/trains/train-speed";
import { cn } from "@/lib/utils";

/** The step closest to `speed`, by ratio: ×3 is nearer ×2 than ×5. */
function nearestStep(speed: number): number {
  let best = 0;
  TRAIN_SPEED_STEPS.forEach((step, index) => {
    if (
      Math.abs(Math.log(step / speed)) <
      Math.abs(Math.log(TRAIN_SPEED_STEPS[best] / speed))
    )
      best = index;
  });
  return best;
}

/**
 * Speed of the trains of the map, as a factor of their real one: a step of
 * the slider, or any value within bounds typed after a click on it. A value
 * between the steps dims the slider, as the history slider does for a day
 * picked.
 */
export function TrainSpeedControl() {
  const t = useTranslations("map.stats");
  const speed = useTrainSpeed();
  const [editing, setEditing] = useState(false);
  const index = TRAIN_SPEED_STEPS.findIndex((step) => step === speed);
  const factor = (value: number) => t("speedValue", { factor: value });

  const commit = (input: HTMLInputElement) => {
    const value = Number(input.value.replace(",", "."));
    if (input.value.trim() !== "" && Number.isFinite(value))
      setTrainSpeed(clampTrainSpeed(value));
    setEditing(false);
  };

  return (
    <div className="flex w-44 shrink-0 flex-col gap-1.5">
      <div className="flex h-5 items-center gap-1 text-xs font-medium">
        <span>{t("trainSpeed")}</span>
        {editing ? (
          <input
            type="number"
            // Opened by a click on the value: typing follows at once.
            autoFocus
            inputMode="decimal"
            min={MIN_TRAIN_SPEED}
            max={MAX_TRAIN_SPEED}
            step={0.1}
            defaultValue={speed}
            aria-label={t("editSpeed", {
              min: MIN_TRAIN_SPEED,
              max: MAX_TRAIN_SPEED,
            })}
            className="h-5 w-14 rounded-sm border bg-background px-1 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onBlur={(event) => commit(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit(event.currentTarget);
              else if (event.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={t("editSpeed", {
              min: MIN_TRAIN_SPEED,
              max: MAX_TRAIN_SPEED,
            })}
            title={t("editSpeed", {
              min: MIN_TRAIN_SPEED,
              max: MAX_TRAIN_SPEED,
            })}
            className="rounded-sm tabular-nums underline decoration-dotted underline-offset-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {factor(speed)}
          </button>
        )}
        {speed === REAL_TRAIN_SPEED && (
          <span className="text-muted-foreground">· {t("realSpeed")}</span>
        )}
      </div>
      <Slider
        className={cn(
          "transition-opacity",
          index < 0 && "opacity-40 grayscale",
        )}
        min={0}
        max={TRAIN_SPEED_STEPS.length - 1}
        step={1}
        value={[index < 0 ? nearestStep(speed) : index]}
        ticks
        rangeClassName="bg-blue-600 dark:bg-blue-500"
        thumbLabel={t("trainSpeed")}
        getAriaValueText={(_, value) => factor(TRAIN_SPEED_STEPS[value])}
        onValueChange={(value) =>
          setTrainSpeed(
            TRAIN_SPEED_STEPS[Array.isArray(value) ? value[0] : value],
          )
        }
      />
      <div
        aria-hidden
        className="flex justify-between text-[0.7rem] text-muted-foreground tabular-nums"
      >
        {TRAIN_SPEED_STEPS.map((step) => (
          <span key={step}>{factor(step)}</span>
        ))}
      </div>
    </div>
  );
}

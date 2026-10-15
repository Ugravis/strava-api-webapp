import { useFormatter, useTranslations } from "next-intl";
import type { LandmarkProgress } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { LandmarkIcon } from "./landmark-icon";
import { ProgressRing } from "./progress-ring";

/** Round badge of a landmark, ringed by the progress of its current iteration. */
export function LandmarkBadge({ landmark }: { landmark: LandmarkProgress }) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const key = `landmarks.${landmark.id}` as const;
  const name = t.has(key) ? t(key) : landmark.id;
  const achieved = landmark.completions > 0;

  return (
    <li className="flex flex-col items-center gap-2 text-center">
      <ProgressRing
        value={landmark.progress}
        label={t("progressLabel", {
          name,
          percent: format.number(landmark.progress, { style: "percent", maximumFractionDigits: 0 }),
        })}
        className="w-24 sm:w-28"
      >
        <div
          className={cn(
            "grid size-[78%] place-items-center rounded-full transition-colors",
            achieved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <LandmarkIcon id={landmark.id} className="size-1/2" strokeWidth={1.75} aria-hidden />
        </div>
      </ProgressRing>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm leading-tight font-medium">{name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {format.number(landmark.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
        </p>
        <p className={cn("text-xs tabular-nums", achieved ? "font-medium text-foreground" : "text-muted-foreground")}>
          {t("completions", { count: landmark.completions })}
        </p>
      </div>
    </li>
  );
}

import { useFormatter, useTranslations } from "next-intl";
import type { LandmarkProgress } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { LandmarkIcon } from "./landmark-icon";
import { ProgressRing } from "./progress-ring";
import { progressTier } from "./progress-tier";

/** Round badge of a landmark, ringed by the progress of its current iteration. */
export function LandmarkBadge({ landmark }: { landmark: LandmarkProgress }) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const key = `landmarks.${landmark.id}` as const;
  const name = t.has(key) ? t(key) : landmark.id;
  const achieved = landmark.completions > 0;
  const tier = progressTier(landmark.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(landmark.progress * 100) / 100, { style: "percent" });

  return (
    <li className="flex flex-col items-center gap-1.5 text-center">
      <ProgressRing
        value={landmark.progress}
        label={t("progressLabel", { name, percent })}
        indicatorClassName={tier.stroke}
        className="w-12 sm:w-14"
      >
        <div
          className={cn(
            "grid size-[72%] place-items-center rounded-full transition-colors",
            achieved ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <LandmarkIcon id={landmark.id} className="size-1/2" strokeWidth={1.75} aria-hidden />
        </div>
        {achieved && (
          <span
            className="absolute -top-1 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-card"
            aria-hidden
          >
            ×{format.number(landmark.completions)}
          </span>
        )}
      </ProgressRing>
      <div className="flex flex-col">
        <p className="text-xs leading-tight font-medium">{name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className={cn("font-medium", tier.text)}>{percent}</span>
          {" · "}
          {format.number(landmark.distanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 1 })}
        </p>
        <span className="sr-only">{t("completions", { count: landmark.completions })}</span>
      </div>
    </li>
  );
}

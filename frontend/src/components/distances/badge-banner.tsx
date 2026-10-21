import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { lightTextOn } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";

/** Background of the banner of each family. */
const FAMILY_GRADIENTS: Record<DistanceFamily, string> = {
  all: "from-violet-500 to-indigo-700",
  run: "from-orange-400 to-rose-600",
  hike: "from-emerald-400 to-teal-700",
  ride: "from-sky-400 to-blue-700",
};

/** Concentric circles behind the icon. */
const RINGS = [36, 60, 84, 108, 132];

/** Header picture of a badge: its icon on its own background or the colors of its family, full once obtained. */
export function BadgeBanner({ badge }: { badge: DistanceBadge }) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const achieved = badge.completions > 0;
  const { background } = badge;
  // Dark text and disc on light backgrounds, like the yellow of the Tour de France.
  const light = background ? lightTextOn(background) : true;

  return (
    <div
      className={cn(
        "relative grid h-32 place-items-center overflow-hidden",
        background ? "bg-cover bg-center" : cn("bg-linear-to-br", FAMILY_GRADIENTS[badge.family]),
        light ? "text-white" : "text-zinc-950",
      )}
      style={
        background?.kind === "color"
          ? { backgroundColor: background.color }
          : background?.kind === "image"
            ? { backgroundImage: `linear-gradient(rgb(0 0 0 / 0.35), rgb(0 0 0 / 0.35)), url("${background.url}")` }
            : undefined
      }
    >
      <svg viewBox="0 0 400 128" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
        {RINGS.map((radius) => (
          <circle key={radius} cx="200" cy="64" r={radius} fill="none" stroke="currentColor" strokeOpacity={0.12} />
        ))}
      </svg>
      <div className="relative">
        <div
          className={cn(
            "grid size-18 place-items-center rounded-full",
            achieved
              ? light
                ? "bg-white text-neutral-900 shadow-lg ring-4 ring-white/30"
                : "bg-neutral-900 text-white shadow-lg ring-4 ring-black/15"
              : light
                ? "border-2 border-dashed border-white/60 bg-white/10"
                : "border-2 border-dashed border-black/40 bg-black/5",
          )}
        >
          <BadgeIcon icon={badge.icon} className="size-9" strokeWidth={1.75} aria-hidden />
        </div>
        {achieved && (
          <span
            className="absolute -top-1 -right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-xs font-semibold text-white tabular-nums ring-2 ring-white"
            aria-hidden
          >
            {badge.tiers ? t("level", { level: badge.completions }) : `×${format.number(badge.completions)}`}
          </span>
        )}
      </div>
    </div>
  );
}

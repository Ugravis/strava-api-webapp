import { useFormatter } from "next-intl";
import type { DistanceBadge, DistanceFamily } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeIcon } from "./badge-icon";

/** Background of the banner of each family. */
export const FAMILY_GRADIENTS: Record<DistanceFamily, string> = {
  all: "from-violet-500 to-indigo-700",
  run: "from-orange-400 to-rose-600",
  hike: "from-emerald-400 to-teal-700",
  ride: "from-sky-400 to-blue-700",
};

/** Concentric circles behind the icon. */
const RINGS = [36, 60, 84, 108, 132];

/** Header picture of a badge: its icon on the colors of its family, full once obtained. */
export function BadgeBanner({ badge }: { badge: DistanceBadge }) {
  const format = useFormatter();
  const achieved = badge.completions > 0;

  return (
    <div
      className={cn(
        "relative grid h-32 place-items-center overflow-hidden bg-linear-to-br text-white",
        FAMILY_GRADIENTS[badge.family],
      )}
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
              ? "bg-white text-neutral-900 shadow-lg ring-4 ring-white/30"
              : "border-2 border-dashed border-white/60 bg-white/10",
          )}
        >
          <BadgeIcon icon={badge.icon} className="size-9" strokeWidth={1.75} aria-hidden />
        </div>
        {achieved && (
          <span
            className="absolute -top-1 -right-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-neutral-900 px-1.5 text-xs font-semibold text-white tabular-nums ring-2 ring-white"
            aria-hidden
          >
            ×{format.number(badge.completions)}
          </span>
        )}
      </div>
    </div>
  );
}

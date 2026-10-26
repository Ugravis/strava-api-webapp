import { AwardIcon, SquareIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MAP_COLORS, TileGrid } from "./tile-grid";

const TILES = [
  "....##......",
  "...####.....",
  "..###qqq#...",
  "..##.qqq##..",
  "...##qqq###.",
  "....####.##.",
  ".....##.....",
] as const;

/** Decorative map of a few outings: tiles, largest square, a track, a river and a railway. */
export function HeroIllustration() {
  const t = useTranslations("landing.hero");

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-green-500/15 blur-3xl" />
      <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/5">
        <svg viewBox="0 0 480 360" className="block h-auto w-full">
          <rect width="480" height="360" className="fill-[#e8d4ae] dark:fill-[#2b2620]" />
          <path
            d="M-10 300 C 80 270, 120 330, 210 310 S 360 250, 490 290 L 490 370 L -10 370 Z"
            fill={MAP_COLORS.water}
            fillOpacity="0.85"
          />
          <TileGrid rows={TILES} cell={34} gap={4} x={12} y={14} emptyClassName="fill-transparent" opacity={() => 0.85} />
          <rect x="199" y="87" width="116" height="116" rx="6" fill="none" stroke={MAP_COLORS.square} strokeWidth="3" />
          {/* Railway, with a visited station and one still to visit. */}
          <path d="M20 250 C 140 230, 260 240, 470 180" className="stroke-neutral-500 dark:stroke-neutral-400" strokeWidth="3" fill="none" />
          <path d="M20 250 C 140 230, 260 240, 470 180" className="stroke-[#e8d4ae] dark:stroke-[#2b2620]" strokeWidth="1.5" strokeDasharray="6 6" fill="none" />
          <circle cx="150" cy="238" r="8" className="fill-white stroke-neutral-800" strokeWidth="3" />
          <circle cx="410" cy="200" r="8" className="fill-neutral-300 stroke-neutral-500" strokeWidth="3" />
          <path
            d="M70 40 C 110 70, 100 120, 150 140 S 220 120, 250 150 S 300 220, 360 200 S 420 140, 440 170"
            fill="none"
            stroke={MAP_COLORS.track}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="70" cy="40" r="6" fill={MAP_COLORS.track} />
          <circle cx="440" cy="170" r="6" className="fill-white" stroke={MAP_COLORS.track} strokeWidth="3" />
        </svg>
      </div>
      <Chip className="-top-4 left-4 sm:-left-6" icon={<SparklesIcon className="size-4 text-green-600" />}>
        <span className="font-semibold">{t("newTiles")}</span>
        <span className="text-muted-foreground">{t("newTilesLabel")}</span>
      </Chip>
      <Chip className="top-1/2 -right-2 hidden sm:-right-8 sm:flex" icon={<SquareIcon className="size-4 text-pink-600" />}>
        <span className="text-muted-foreground">{t("square")}</span>
        <span className="font-semibold">{t("squareValue")}</span>
      </Chip>
      <Chip className="right-4 -bottom-5 sm:left-10" icon={<AwardIcon className="size-4 text-amber-500" />}>
        <span className="text-muted-foreground">{t("badge")}</span>
        <span className="font-semibold">{t("badgeName")}</span>
      </Chip>
    </div>
  );
}

function Chip({ className, icon, children }: { className: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-2 rounded-xl border bg-background/90 px-3 py-2 text-xs shadow-lg backdrop-blur sm:text-sm",
        className,
      )}
    >
      {icon}
      <span className="flex flex-col leading-tight">{children}</span>
    </div>
  );
}

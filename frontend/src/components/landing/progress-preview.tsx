import { CheckIcon, FlameIcon, FlagIcon, Grid3x3Icon, SquareIcon, TrainFrontIcon, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MAP_COLORS, TileGrid } from "./tile-grid";

const POINTS = ["tiles", "countries", "streak"] as const;

const STATS: { key: "tiles" | "square" | "stations" | "countries"; icon: LucideIcon; className: string }[] = [
  { key: "tiles", icon: Grid3x3Icon, className: "text-green-600" },
  { key: "square", icon: SquareIcon, className: "text-pink-600" },
  { key: "stations", icon: TrainFrontIcon, className: "text-amber-500" },
  { key: "countries", icon: FlagIcon, className: "text-sky-600" },
];

const PREVIEW_TILES = ["...##.......", "..#####.##..", ".##qqq####..", "..#qqq###...", "..#qqq#.##..", "...####....."];

/** Mock-up of the dashboard, with sample figures. */
function DashboardMock() {
  const t = useTranslations("landing.progress.mock");

  return (
    <div aria-hidden className="relative rounded-3xl border bg-card p-4 shadow-xl shadow-black/5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-8 rounded-full bg-linear-to-br from-green-500 to-emerald-700" />
          <span className="h-2.5 w-24 rounded-full bg-foreground/70" />
        </div>
        <span className="flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
          <FlameIcon className="size-3.5" />
          {t("streak")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {STATS.map(({ key, icon: Icon, className }) => (
          <div key={key} className="flex flex-col gap-1 rounded-xl border bg-background p-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className={cn("size-3.5", className)} />
              {t(key)}
            </span>
            <span className="text-xl font-semibold tabular-nums sm:text-2xl">{t(`${key}Value`)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border">
        <svg viewBox="0 0 400 150" className="block h-auto w-full">
          <rect width="400" height="150" className="fill-[#e8d4ae] dark:fill-[#2b2620]" />
          <TileGrid rows={PREVIEW_TILES} cell={20} gap={3} x={62} y={8} emptyClassName="fill-transparent" opacity={() => 0.85} />
          <path d="M40 140 C 120 110, 150 60, 230 70 S 320 40, 380 20" fill="none" stroke={MAP_COLORS.track} strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function ProgressPreview() {
  const t = useTranslations("landing.progress");

  return (
    <section aria-labelledby="progress-title" className="border-t bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("eyebrow")}</p>
          <h2 id="progress-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h2>
          <p className="text-pretty text-muted-foreground sm:text-lg">{t("description")}</p>
          <ul className="mt-2 flex flex-col gap-3">
            {POINTS.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <CheckIcon className="size-3" aria-hidden />
                </span>
                <span>{t(`points.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <DashboardMock />
      </div>
    </section>
  );
}

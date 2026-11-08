import { useTranslations } from "next-intl";
import { MAP_COLORS, TileGrid } from "./tile-grid";

function AccountIllustration() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden className="block h-auto w-full">
      <rect x="40" y="10" width="120" height="100" rx="10" className="fill-background stroke-border" />
      <rect x="54" y="26" width="50" height="6" rx="3" className="fill-foreground/70" />
      <rect x="54" y="42" width="92" height="14" rx="4" className="fill-muted stroke-border" />
      <rect x="54" y="62" width="92" height="14" rx="4" className="fill-muted stroke-border" />
      <rect x="54" y="84" width="92" height="14" rx="4" className="fill-primary" />
    </svg>
  );
}

function SyncIllustration() {
  return (
    <svg viewBox="0 0 200 120" aria-hidden className="block h-auto w-full">
      {[0, 1, 2].map((index) => {
        const y = 12 + index * 34;
        return (
          <g key={index} opacity={1 - index * 0.25}>
            <rect x="24" y={y} width="152" height="28" rx="7" className="fill-background stroke-border" />
            <path d={`M36 ${y + 18} q 8 -12 16 -4 t 16 -4`} fill="none" stroke={MAP_COLORS.track} strokeWidth="2.5" strokeLinecap="round" />
            <rect x="80" y={y + 10} width="56" height="5" rx="2.5" className="fill-foreground/60" />
            <rect x="80" y={y + 18} width="34" height="4" rx="2" className="fill-foreground/25" />
            <circle cx="160" cy={y + 14} r="7" fill={MAP_COLORS.tile} />
            <path d={`M156.5 ${y + 14} l2.5 2.5 l4.5 -5`} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}

function ExploreIllustration() {
  const rows = ["..##.#", ".#####", "###q#.", ".####."];
  return (
    <svg viewBox="0 0 200 120" aria-hidden className="block h-auto w-full">
      <TileGrid rows={rows} cell={24} gap={4} x={16} y={4} emptyClassName="fill-muted" />
      <path d="M24 100 C 60 70, 80 40, 120 50 S 170 30, 180 12" fill="none" stroke={MAP_COLORS.track} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  { key: "one", Illustration: AccountIllustration },
  { key: "two", Illustration: SyncIllustration },
  { key: "three", Illustration: ExploreIllustration },
] as const;

export function Steps() {
  const t = useTranslations("landing.steps");

  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="scroll-mt-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:py-24">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">{t("eyebrow")}</p>
          <h2 id="steps-title" className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h2>
        </header>
        <ol className="grid gap-5 md:grid-cols-3">
          {STEPS.map(({ key, Illustration }, index) => (
            <li key={key} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
              <div className="border-b bg-muted/50 px-6 py-5">
                <Illustration />
              </div>
              <div className="flex gap-4 p-5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{t(`${key}.title`)}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">{t(`${key}.description`)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

"use client";

import { ChevronLeftIcon, ChevronRightIcon, DicesIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BadgeMetric, DistanceBadge, DistanceFamily, DistancesOverview } from "@/lib/api/types";
import { CHALLENGE_METRICS } from "@/lib/badge-amount";
import { closestBadges, recentBadges } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";
import { BadgeCard } from "./badge-card";
import { BadgeMedal } from "./badge-medal";
import { BadgeMiniBar } from "./badge-mini-bar";
import { FamilyIcon } from "./family-icon";
import { progressTier } from "./progress-tier";
import { useAmount } from "./use-amount";

/** Sports detailed under the total of a tab counting a single metric. */
const SPORTS: DistanceFamily[] = ["run", "hike", "ride", "swim"];

/** Badges of each list of the carousel. */
const CAROUSEL_SIZE = 10;

/** Lists of the carousel. */
const CAROUSEL_LISTS = ["closest", "recent"] as const;

type CarouselList = (typeof CAROUSEL_LISTS)[number];

interface AchievementsHeaderProps {
  /** Marks the kind of the badges of the carousel, where kinds mix. */
  showKind: boolean;
  /** Metrics of the main widget, at most four. */
  headlines: readonly BadgeMetric[];
  totals: DistancesOverview["totals"];
  /** Badges of the tab. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
}

/** A total without decimals, its number alone for the counts, its label telling what is counted. */
function useStatValue(): (metric: BadgeMetric, value: number) => string {
  const format = useFormatter();
  const amount = useAmount();
  return (metric, value) =>
    CHALLENGE_METRICS.includes(metric) ? format.number(Math.round(value)) : amount(metric, value, true);
}

/** Square widgets of the header. */
const SQUARE = "aspect-square min-w-0 rounded-xl";

/**
 * Header of the achievements page: the main totals of the tab, a badge drawn
 * at random and the badge closest to completion, then a carousel.
 */
export function AchievementsHeader({ showKind, headlines, totals, badges, onOpen }: AchievementsHeaderProps) {
  const t = useTranslations("distances.header");

  return (
    <section
      aria-label={t("label")}
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-[13rem_13rem_minmax(0,1fr)]">
        <HeadlineWidget headlines={headlines} totals={totals} />
        <RandomBadgeWidget badges={badges} onOpen={onOpen} />
        <ClosestBadgeWidget badges={badges} onOpen={onOpen} />
      </div>
      {badges.length > 0 && <BadgeCarousel badges={badges} showKind={showKind} onOpen={onOpen} />}
    </section>
  );
}

/** The main totals of the tab in a dark square: the first one in large, the others or its sports under it. */
function HeadlineWidget({ headlines, totals }: Pick<AchievementsHeaderProps, "headlines" | "totals">) {
  const t = useTranslations("distances");
  const value = useStatValue();
  const [top, ...others] = headlines;
  const details =
    others.length > 0
      ? others.map((metric) => ({ key: metric, label: t(`header.metrics.${metric}`), value: value(metric, totals[metric].all) }))
      : SPORTS.map((family) => ({ key: family, label: t(`families.${family}`), value: value(top, totals[top][family]) }));

  return (
    <div
      // Dark whatever the theme.
      className={cn(
        SQUARE,
        "flex flex-col justify-between gap-2 bg-linear-to-br from-zinc-800 to-zinc-950 p-3 text-zinc-50 ring-1 ring-white/10 sm:p-4",
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
          {t(`header.metrics.${top}`)}
        </span>
        <span className="truncate text-2xl font-semibold tabular-nums sm:text-3xl">{value(top, totals[top].all)}</span>
      </div>
      <dl className="flex min-w-0 flex-col gap-0.5 text-xs">
        {details.map((detail) => (
          <div key={detail.key} className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="truncate text-zinc-400">{detail.label}</dt>
            <dd className="shrink-0 font-medium text-zinc-200 tabular-nums">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Length of a roll of the die. */
const ROLL_MS = 1000;

/** A badge drawn at random once the die is rolled, drawn again with each roll. */
function RandomBadgeWidget({ badges, onOpen }: { badges: DistanceBadge[]; onOpen: (badgeId: string) => void }) {
  const t = useTranslations("distances.header");
  const format = useFormatter();
  const [badge, setBadge] = useState<DistanceBadge | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const roll = () => {
    if (rolling || badges.length === 0) return;
    setRolling(true);
    timer.current = window.setTimeout(() => {
      // Another badge whenever there is one.
      const pool = badges.length > 1 ? badges.filter((candidate) => candidate.id !== badge?.id) : badges;
      setBadge(pool[Math.floor(Math.random() * pool.length)]);
      setRolling(false);
    }, ROLL_MS);
  };

  const die = (
    <DicesIcon className={cn("size-12 text-muted-foreground", rolling && "animate-dice-roll motion-reduce:animate-none")} />
  );

  if (!badge || rolling) {
    return (
      <button
        type="button"
        onClick={roll}
        disabled={badges.length === 0}
        aria-label={t("roll")}
        aria-busy={rolling}
        className={cn(
          SQUARE,
          "flex flex-col items-center justify-center gap-2 bg-muted/50 ring-1 ring-foreground/5 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
      >
        {die}
        <span className="text-xs font-medium text-muted-foreground">{t("rollHint")}</span>
      </button>
    );
  }

  return (
    <div className={cn(SQUARE, "relative flex flex-col bg-muted/50 p-2 ring-1 ring-foreground/5")}>
      <span className="truncate pr-7 pl-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {t("random")}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-1 right-1 text-muted-foreground"
        onClick={roll}
        aria-label={t("reroll")}
        title={t("reroll")}
      >
        <DicesIcon />
      </Button>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        className="group flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-center outline-none animate-in fade-in-0 zoom-in-95 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BadgeMedal
          badge={badge}
          index={0}
          className="w-12 transition-transform group-hover:scale-105 motion-reduce:transition-none sm:w-14"
        />
        <span className="line-clamp-2 text-xs leading-tight font-semibold">{badge.name}</span>
        <span className={cn("text-xs font-semibold tabular-nums", progressTier(badge.progress).text)}>
          {format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" })}
        </span>
      </button>
    </div>
  );
}

/** Discreet chevrons around a title, cycling through the contents of a widget. */
function WidgetSwitcher<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: (option: T) => string;
}) {
  const t = useTranslations("distances.header");
  const index = options.indexOf(value);
  const step = (by: number) => onChange(options[(index + by + options.length) % options.length]);
  const chevron =
    "size-6 shrink-0 text-muted-foreground/70 hover:bg-transparent hover:text-foreground dark:hover:bg-transparent";

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <Button variant="ghost" size="icon-xs" className={chevron} onClick={() => step(-1)} aria-label={t("previous")}>
        <ChevronLeftIcon />
      </Button>
      <span
        className="min-w-0 truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
        aria-live="polite"
      >
        {label(value)}
      </span>
      <Button variant="ghost" size="icon-xs" className={chevron} onClick={() => step(1)} aria-label={t("next")}>
        <ChevronRightIcon />
      </Button>
    </div>
  );
}

/** Badges the closest widget picks from: those never completed yet, or all of them. */
const CLOSEST_SCOPES = ["closestNew", "closest"] as const;

type ClosestScope = (typeof CLOSEST_SCOPES)[number];

/** The badge closest to completion, among all or among those never completed, with what is left to complete it. */
function ClosestBadgeWidget({ badges, onOpen }: { badges: DistanceBadge[]; onOpen: (badgeId: string) => void }) {
  const t = useTranslations("distances.header");
  const format = useFormatter();
  const amount = useAmount();
  const [picked, setScope] = useState<ClosestScope | null>(null);
  const [closestNew] = closestBadges(
    badges.filter((candidate) => candidate.completions === 0),
    1,
  );
  // Those never completed first, unless there are none left.
  const scope = picked ?? (closestNew ? "closestNew" : "closest");
  const [badge] = scope === "closestNew" ? [closestNew] : closestBadges(badges, 1);

  return (
    <div className="col-span-2 flex min-w-0 flex-col gap-1 rounded-xl bg-muted/50 p-2 ring-1 ring-foreground/5 @2xl:col-span-1">
      <WidgetSwitcher options={CLOSEST_SCOPES} value={scope} onChange={setScope} label={(option) => t(option)} />
      {badge ? (
        <button
          key={badge.id}
          type="button"
          onClick={() => onOpen(badge.id)}
          aria-haspopup="dialog"
          className="group flex flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left outline-none animate-in fade-in-0 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-4"
        >
          <BadgeMedal
            badge={badge}
            index={0}
            className="w-10 shrink-0 transition-transform group-hover:scale-105 motion-reduce:transition-none sm:w-11"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="line-clamp-2 leading-tight font-semibold">{badge.name}</span>
            <BadgeMiniBar value={badge.progress} />
            <span className="text-xs text-muted-foreground tabular-nums">
              <span className={cn("font-semibold", progressTier(badge.progress).text)}>
                {format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" })}
              </span>
              {badge.progress < 1 &&
                ` · ${t("remaining", { amount: amount(badge.metric, Math.max(0, badge.goal - badge.covered)) })}`}
            </span>
          </span>
        </button>
      ) : (
        <p className="grid flex-1 place-items-center p-4 text-center text-sm text-muted-foreground">{t("closestNone")}</p>
      )}
    </div>
  );
}

/** Badges nearly obtained or new to the catalog, as cards scrolled sideways. */
function BadgeCarousel({
  badges,
  showKind,
  onOpen,
}: {
  badges: DistanceBadge[];
  showKind: boolean;
  onOpen: (badgeId: string) => void;
}) {
  const t = useTranslations("distances.header");
  const [list, setList] = useState<CarouselList>("closest");
  const track = useRef<HTMLUListElement>(null);
  const shown = list === "closest" ? closestBadges(badges, CAROUSEL_SIZE) : recentBadges(badges, CAROUSEL_SIZE);

  // Back to the start for each list.
  useEffect(() => {
    if (track.current) track.current.scrollLeft = 0;
  }, [list]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("carousel")}
      className="flex min-w-0 flex-col gap-1 rounded-xl bg-muted/50 p-2 ring-1 ring-foreground/5"
    >
      <WidgetSwitcher
        options={CAROUSEL_LISTS}
        value={list}
        onChange={setList}
        label={(option) => t(`slides.${option}`)}
      />
      <ul
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-1 gap-2 overflow-x-auto p-1"
      >
        {shown.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            layout="vertical"
            index={index}
            showFavorite
            showKind={showKind}
            onOpen={onOpen}
            className="w-32 shrink-0 snap-start sm:w-36"
          />
        ))}
      </ul>
    </div>
  );
}

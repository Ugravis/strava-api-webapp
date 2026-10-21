"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BadgeMetric, DistanceBadge, DistanceFamily, DistancesOverview } from "@/lib/api/types";
import { CHALLENGE_METRICS } from "@/lib/badge-amount";
import { closestBadges, recentBadges } from "@/lib/badge-sort";
import { cn } from "@/lib/utils";
import { BadgeMedal } from "./badge-medal";
import { FamilyIcon } from "./family-icon";
import { progressTier } from "./progress-tier";
import { useAmount } from "./use-amount";

/** Sports detailed under the total of a tab counting a single metric. */
const SPORTS: DistanceFamily[] = ["run", "hike", "ride"];

/** Badges of each slide of the carousel. */
const SLIDE_SIZE = 4;

interface AchievementsHeaderProps {
  /** Metrics of the tab, in display order. */
  metrics: readonly BadgeMetric[];
  totals: DistancesOverview["totals"];
  /** Badges of the tab. */
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
}

/** A total, its number alone for the counts, its label telling what is counted. */
function useStatValue(): (metric: BadgeMetric, value: number) => string {
  const format = useFormatter();
  const amount = useAmount();
  return (metric, value) => (CHALLENGE_METRICS.includes(metric) ? format.number(Math.round(value)) : amount(metric, value));
}

/** Share of a badge rounded down, an unfinished iteration never showing 100 %. */
function useShare(): (badge: DistanceBadge) => string {
  const format = useFormatter();
  return (badge) => format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });
}

/** Header of the achievements page: the totals of the tab, the badge closest to completion and a carousel. */
export function AchievementsHeader({ metrics, totals, badges, onOpen }: AchievementsHeaderProps) {
  const t = useTranslations("distances.header");
  const closest = closestBadges(badges, SLIDE_SIZE + 1);
  const [featured, ...nearly] = closest;
  const slides = [
    { id: "closest", badges: nearly },
    { id: "recent", badges: recentBadges(badges, SLIDE_SIZE) },
  ].filter((slide) => slide.badges.length > 0);

  return (
    <section
      aria-label={t("label")}
      // Dark whatever the theme.
      className="flex flex-col gap-5 overflow-hidden rounded-2xl bg-linear-to-br from-zinc-800 via-zinc-900 to-zinc-950 p-4 text-zinc-50 ring-1 ring-white/10 sm:p-6"
    >
      <HeaderTotals metrics={metrics} totals={totals} />
      {(featured || slides.length > 0) && (
        <div className="grid gap-3 @2xl:grid-cols-2">
          {featured && <FeaturedBadge badge={featured} onOpen={onOpen} />}
          {slides.length > 0 && <BadgeCarousel slides={slides} onOpen={onOpen} />}
        </div>
      )}
    </section>
  );
}

function HeaderTotals({ metrics, totals }: Pick<AchievementsHeaderProps, "metrics" | "totals">) {
  const t = useTranslations("distances");
  const value = useStatValue();

  if (metrics.length === 1) {
    const [metric] = metrics;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
            {t(`header.metrics.${metric}`)}
          </span>
          <span className="text-3xl font-semibold tabular-nums sm:text-4xl">{value(metric, totals[metric].all)}</span>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-zinc-300">
          {SPORTS.map((family) => (
            <li key={family} className="flex items-center gap-1.5 tabular-nums">
              <FamilyIcon family={family} className="size-4 text-zinc-400" aria-hidden />
              <span className="sr-only">{t(`families.${family}`)} :</span>
              {value(metric, totals[metric][family])}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @md:grid-cols-3 @2xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric} className="flex flex-col">
          <dt className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{t(`header.metrics.${metric}`)}</dt>
          <dd className="text-xl font-semibold tabular-nums">{value(metric, totals[metric].all)}</dd>
        </div>
      ))}
    </dl>
  );
}

function FeaturedBadge({ badge, onOpen }: { badge: DistanceBadge; onOpen: (badgeId: string) => void }) {
  const t = useTranslations("distances.header");
  const amount = useAmount();
  const share = useShare();
  const tier = progressTier(badge.progress);

  return (
    <button
      type="button"
      onClick={() => onOpen(badge.id)}
      aria-haspopup="dialog"
      className="group flex items-center gap-4 rounded-xl bg-white/5 p-4 text-left ring-1 ring-white/10 outline-none transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <BadgeMedal
        badge={badge}
        index={0}
        className="w-16 shrink-0 transition-transform group-hover:scale-105 motion-reduce:transition-none sm:w-20"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{t("closest")}</span>
        <span className="truncate font-semibold">{badge.name}</span>
        <span className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
          <span className={cn("block h-full rounded-full", tier.fill)} style={{ width: `${badge.progress * 100}%` }} />
        </span>
        <span className="text-xs text-zinc-300 tabular-nums">
          {share(badge)} · {t("remaining", { amount: amount(badge.metric, Math.max(0, badge.goal - badge.covered)) })}
        </span>
      </span>
    </button>
  );
}

interface Slide {
  id: string;
  badges: DistanceBadge[];
}

/** Slides scrolled sideways, by swiping or with the buttons. */
function BadgeCarousel({ slides, onOpen }: { slides: Slide[]; onOpen: (badgeId: string) => void }) {
  const t = useTranslations("distances.header");
  const share = useShare();
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const show = (index: number) => {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: index * element.clientWidth, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("carousel")}
      className="flex min-w-0 flex-col gap-2 rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
    >
      <div className="flex items-center gap-1">
        <h3 className="flex-1 truncate px-1 text-xs font-medium tracking-wide text-zinc-400 uppercase" aria-live="polite">
          {t(`slides.${slides[current]?.id ?? slides[0].id}`)}
        </h3>
        {slides.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-zinc-300 hover:bg-white/10 hover:text-white"
              onClick={() => show(current - 1)}
              disabled={current === 0}
              aria-label={t("previous")}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-zinc-300 hover:bg-white/10 hover:text-white"
              onClick={() => show(current + 1)}
              disabled={current === slides.length - 1}
              aria-label={t("next")}
            >
              <ChevronRightIcon />
            </Button>
          </>
        )}
      </div>
      <div
        ref={track}
        onScroll={(event) => {
          const element = event.currentTarget;
          setCurrent(Math.round(element.scrollLeft / Math.max(element.clientWidth, 1)));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {slides.map((slide, index) => (
          <ul
            key={slide.id}
            aria-roledescription="slide"
            aria-label={t("slide", { number: index + 1, total: slides.length })}
            inert={index !== current}
            className="grid w-full shrink-0 snap-start grid-cols-2 gap-1"
          >
            {slide.badges.map((badge, rank) => (
              <li key={badge.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onOpen(badge.id)}
                  aria-haspopup="dialog"
                  className="group flex w-full items-center gap-2 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-white/10 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <BadgeMedal badge={badge} index={rank} className="w-9 shrink-0 sm:w-9" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-medium">{badge.name}</span>
                    <span className="text-xs text-zinc-400 tabular-nums">{share(badge)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-1.5" aria-hidden>
          {slides.map((slide, index) => (
            <span
              key={slide.id}
              className={cn("h-1.5 rounded-full transition-all", index === current ? "w-4 bg-white" : "w-1.5 bg-white/30")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

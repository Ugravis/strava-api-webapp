"use client";

import { ChevronLeftIcon, ChevronRightIcon, DicesIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";
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
const SPORTS: DistanceFamily[] = ["run", "hike", "ride"];

/** Badges of each list of the carousel. */
const CAROUSEL_SIZE = 10;

/** Lists of the carousel. */
const CAROUSEL_LISTS = ["closest", "recent"] as const;

type CarouselList = (typeof CAROUSEL_LISTS)[number];

interface AchievementsHeaderProps {
  /** Metrics of the main widget, at most four. */
  headlines: readonly BadgeMetric[];
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

/**
 * Header of the achievements page: the main totals of the tab, the badge
 * closest to completion and a random one, then a carousel.
 */
export function AchievementsHeader({ headlines, totals, badges, onOpen }: AchievementsHeaderProps) {
  const t = useTranslations("distances.header");
  const [closest] = closestBadges(badges, 1);
  const others = badges.filter((badge) => badge !== closest);
  // A share of the list rather than a rank, the list changing with the tab.
  const [seed, setSeed] = useState(() => Math.random());
  const [rolls, setRolls] = useState(0);
  const random = others.length > 0 ? others[Math.floor(seed * others.length)] : undefined;

  const reroll = () => {
    const current = Math.floor(seed * others.length);
    let next = Math.random();
    // Another badge whenever there is one.
    while (others.length > 1 && Math.floor(next * others.length) === current) next = Math.random();
    setSeed(next);
    setRolls(rolls + 1);
  };

  return (
    <section
      aria-label={t("label")}
      className="flex flex-col gap-4 rounded-2xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4"
    >
      <div className="grid gap-3 @lg:grid-cols-[12rem_1fr] @3xl:grid-cols-[13rem_1fr_1fr]">
        <HeadlineWidget headlines={headlines} totals={totals} />
        {closest && <FeaturedBadge title={t("closest")} badge={closest} onOpen={onOpen} />}
        {random && (
          <FeaturedBadge
            title={t("random")}
            badge={random}
            onOpen={onOpen}
            action={
              <Button
                variant="ghost"
                size="icon-sm"
                className="-my-1 text-muted-foreground"
                onClick={reroll}
                disabled={others.length < 2}
                aria-label={t("reroll")}
                title={t("reroll")}
              >
                <DicesIcon
                  className="transition-transform duration-500 motion-reduce:transition-none"
                  style={{ transform: `rotate(${rolls * 360}deg)` }}
                />
              </Button>
            }
          />
        )}
      </div>
      {badges.length > 0 && <BadgeCarousel badges={badges} onOpen={onOpen} />}
    </section>
  );
}

/** The main totals of the tab in a dark square: one with its sports, or up to four. */
function HeadlineWidget({ headlines, totals }: Pick<AchievementsHeaderProps, "headlines" | "totals">) {
  const t = useTranslations("distances");
  const value = useStatValue();
  // Dark whatever the theme.
  const widget =
    "flex flex-col rounded-xl bg-linear-to-br from-zinc-800 to-zinc-950 p-4 text-zinc-50 ring-1 ring-white/10 @lg:row-span-2 @lg:aspect-square @3xl:row-span-1";

  if (headlines.length === 1) {
    const [metric] = headlines;
    return (
      <div className={cn(widget, "justify-between gap-4")}>
        <div className="flex flex-col">
          <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
            {t(`header.metrics.${metric}`)}
          </span>
          <span className="text-3xl font-semibold tabular-nums">{value(metric, totals[metric].all)}</span>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-300 @lg:flex-col">
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
    <dl className={cn(widget, "grid grid-cols-2 content-between gap-3")}>
      {headlines.map((metric) => (
        <div key={metric} className="flex min-w-0 flex-col">
          <dt className="truncate text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
            {t(`header.metrics.${metric}`)}
          </dt>
          <dd className="truncate text-lg font-semibold tabular-nums">{value(metric, totals[metric].all)}</dd>
        </div>
      ))}
    </dl>
  );
}

interface FeaturedBadgeProps {
  title: string;
  badge: DistanceBadge;
  onOpen: (badgeId: string) => void;
  /** Button beside the title. */
  action?: ReactNode;
}

/** A badge put forward, with its progress and what is left to complete it. */
function FeaturedBadge({ title, badge, onOpen, action }: FeaturedBadgeProps) {
  const t = useTranslations("distances.header");
  const format = useFormatter();
  const amount = useAmount();
  const tier = progressTier(badge.progress);
  // Rounded down: an unfinished iteration never shows 100 %.
  const percent = format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" });

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-muted/50 p-3 ring-1 ring-foreground/5">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</span>
        {action}
      </div>
      <button
        type="button"
        onClick={() => onOpen(badge.id)}
        aria-haspopup="dialog"
        className="group flex flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <BadgeMedal
          badge={badge}
          index={0}
          className="w-16 shrink-0 transition-transform group-hover:scale-105 motion-reduce:transition-none sm:w-16"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="line-clamp-2 leading-tight font-semibold">{badge.name}</span>
          <BadgeMiniBar value={badge.progress} />
          <span className="text-xs text-muted-foreground tabular-nums">
            <span className={cn("font-semibold", tier.text)}>{percent}</span>
            {badge.progress < 1 &&
              ` · ${t("remaining", { amount: amount(badge.metric, Math.max(0, badge.goal - badge.covered)) })}`}
          </span>
        </span>
      </button>
    </div>
  );
}

/** Badges nearly obtained or new to the catalog, as cards scrolled sideways. */
function BadgeCarousel({ badges, onOpen }: { badges: DistanceBadge[]; onOpen: (badgeId: string) => void }) {
  const t = useTranslations("distances.header");
  const [list, setList] = useState<CarouselList>("closest");
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const shown = list === "closest" ? closestBadges(badges, CAROUSEL_SIZE) : recentBadges(badges, CAROUSEL_SIZE);

  const updateEdges = () => {
    const element = track.current;
    if (!element) return;
    setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
  };

  // Back to the start, and the buttons updated, for each list and width.
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    element.scrollLeft = 0;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    return () => observer.disconnect();
  }, [list]);

  const scroll = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={t("carousel")} className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-full bg-muted p-0.5" role="group" aria-label={t("carouselLists")}>
          {CAROUSEL_LISTS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setList(option)}
              aria-pressed={list === option}
              className={cn(
                "h-7 rounded-full px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                list === option ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`slides.${option}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto hidden gap-1 sm:flex">
          <Button variant="outline" size="icon-sm" onClick={() => scroll(-1)} disabled={edges.start} aria-label={t("previous")}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => scroll(1)} disabled={edges.end} aria-label={t("next")}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
      <ul
        ref={track}
        onScroll={updateEdges}
        className="no-scrollbar -mx-1 flex snap-x snap-mandatory scroll-px-1 gap-2 overflow-x-auto px-1 py-1"
      >
        {shown.map((badge, index) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            layout="vertical"
            index={index}
            showFavorite
            onOpen={onOpen}
            className="w-32 shrink-0 snap-start sm:w-36"
          />
        ))}
      </ul>
    </div>
  );
}

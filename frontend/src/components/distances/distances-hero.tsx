"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { DistanceBadge, DistancesOverview } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { BadgeBar } from "./badge-bar";
import { BadgeIcon } from "./badge-icon";
import { latestBadges, nextBadges, remainingM } from "./badge-view";
import { FamilyIcon } from "./family-icon";
import { HeroCarousel, type HeroSlide } from "./hero-carousel";
import { progressTier } from "./progress-tier";

/** The badge closest to being unlocked, then the following ones. */
const NEXT_COUNT = 4;
/** Badges on each slide of the carousel. */
const SLIDE_COUNT = 3;

interface DistancesHeroProps {
  overview: DistancesOverview;
  onOpen: (badgeId: string) => void;
}

interface HeroBadgeProps {
  badge: DistanceBadge;
  onOpen: (badgeId: string) => void;
  /** The closest badge, shown larger. */
  featured?: boolean;
}

/** A badge to unlock: its icon beside its name, over a horizontal progress bar. */
function HeroBadge({ badge, onOpen, featured }: HeroBadgeProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  // Rounded down: an unfinished iteration never shows 100 %.
  const share = Math.floor(badge.progress * 100) / 100;
  const percent = format.number(share, { style: "percent" });
  const km = (meters: number) =>
    format.number(meters / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: meters < 10_000 ? 1 : 0 });

  return (
    <button
      type="button"
      onClick={() => onOpen(badge.id)}
      aria-haspopup="dialog"
      className={cn(
        "flex w-full items-center gap-3 rounded-xl text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-white/40",
        featured ? "bg-white/5 p-3 ring-1 ring-white/10 hover:bg-white/10" : "p-2 hover:bg-white/10",
      )}
    >
      <span
        className={cn(
          "grid flex-none place-items-center rounded-full bg-white text-neutral-900",
          featured ? "size-11" : "size-8",
        )}
        aria-hidden
      >
        <BadgeIcon icon={badge.icon} className={featured ? "size-5" : "size-4"} strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("flex min-w-0 items-center gap-1.5 font-medium", featured ? "text-sm sm:text-base" : "text-sm")}>
            <span className="truncate">{badge.name}</span>
            {badge.family !== "all" && (
              <>
                <FamilyIcon family={badge.family} className="size-3.5 flex-none text-white/50" aria-hidden />
                <span className="sr-only">{t(`families.${badge.family}`)}</span>
              </>
            )}
          </span>
          <span className={cn("flex-none font-semibold tabular-nums", featured ? "text-sm" : "text-xs")}>{percent}</span>
        </span>
        <BadgeBar
          value={share}
          label={t("progressLabel", { name: badge.name, percent })}
          className={cn("bg-white/15", featured ? "h-1.5" : "h-1")}
          fillClassName={progressTier(badge.progress).fill}
        />
        <span className="text-xs text-white/60 tabular-nums">
          {t("card.remaining", { distance: km(remainingM(badge)) })}
        </span>
      </span>
    </button>
  );
}

function HeroBadgeList({ badges, onOpen }: { badges: DistanceBadge[]; onOpen: (badgeId: string) => void }) {
  return (
    <ul className="-mx-2 grid gap-1 sm:grid-cols-3">
      {badges.map((badge) => (
        <li key={badge.id}>
          <HeroBadge badge={badge} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

/** Top of the page: the total distance, the badge closest to being unlocked, then the next and latest ones. */
export function DistancesHero({ overview, onOpen }: DistancesHeroProps) {
  const t = useTranslations("distances.hero");
  const format = useFormatter();
  const [closest, ...following] = nextBadges(overview.badges, NEXT_COUNT);
  const latest = latestBadges(overview.badges, SLIDE_COUNT);
  const slides: HeroSlide[] = [
    { id: "next", title: t("next"), badges: following },
    { id: "latest", title: t("latest"), badges: latest },
  ]
    .filter((slide) => slide.badges.length > 0)
    .map(({ badges, ...slide }) => ({ ...slide, content: <HeroBadgeList badges={badges} onOpen={onOpen} /> }));

  return (
    <section
      aria-label={t("label")}
      className="grid gap-5 rounded-2xl bg-neutral-900 p-4 text-white ring-1 ring-white/10 sm:p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-8"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-white/60">{t("total")}</span>
          <p className="flex items-baseline gap-1 tabular-nums">
            <span className="text-3xl font-bold tracking-tight">
              {format.number(overview.totals.all / 1000, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm font-medium text-white/60">{t("unit")}</span>
          </p>
        </div>
        {closest && (
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-medium text-white/60">{t("closest")}</h2>
            <HeroBadge badge={closest} onOpen={onOpen} featured />
          </div>
        )}
      </div>
      {slides.length > 0 && (
        <div className="flex flex-col justify-end">
          <HeroCarousel slides={slides} />
        </div>
      )}
    </section>
  );
}

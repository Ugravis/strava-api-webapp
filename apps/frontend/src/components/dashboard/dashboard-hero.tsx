"use client";

import { MapIcon, TrophyIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/components/user/user-provider";
import { routes } from "@/config/routes";
import type { ActivitiesOverview, ActivityStats } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";

/** Landmarks the lifetime totals are compared to. */
const EARTH_CIRCUMFERENCE_M = 40_075_000;
const EVEREST_M = 8_849;

interface DashboardHeroProps {
  /** Null while loading. */
  stats: ActivityStats | null;
  /** Null while loading. */
  overview: ActivitiesOverview | null;
  /** Greeting alone, before any activity is imported. */
  welcome?: boolean;
}

/** Greeting, the latest activity, the lifetime totals and the ways to the map and the achievements. */
export function DashboardHero({ stats, overview, welcome }: DashboardHeroProps) {
  const t = useTranslations("dashboard.hero");
  const format = useFormatter();
  const user = useCurrentUser();
  const now = useNow({ updateInterval: 60_000 });
  const hour = now.getHours();
  const greeting = hour < 5 || hour >= 18 ? "evening" : "morning";
  const latest = overview?.recent[0];

  const ratio = (value: number) => format.number(value, { maximumFractionDigits: value < 10 ? 1 : 0 });
  const figures: { key: string; label: string; value: string | null; detail?: string }[] = [
    {
      key: "distance",
      label: t("distance"),
      value: stats && format.number(stats.totalDistanceM / 1000, { style: "unit", unit: "kilometer", maximumFractionDigits: 0 }),
      detail: stats && stats.totalDistanceM > 0 ? t("earth", { ratio: ratio(stats.totalDistanceM / EARTH_CIRCUMFERENCE_M) }) : undefined,
    },
    {
      key: "elevation",
      label: t("elevation"),
      value: stats && format.number(stats.totalElevationGainM, { style: "unit", unit: "meter", maximumFractionDigits: 0 }),
      detail: stats && stats.totalElevationGainM > 0 ? t("everest", { ratio: ratio(stats.totalElevationGainM / EVEREST_M) }) : undefined,
    },
    {
      key: "time",
      label: t("time"),
      value: stats && format.number(Math.floor(stats.totalMovingTimeS / 3600), { style: "unit", unit: "hour", unitDisplay: "short" }),
      detail: stats && stats.totalMovingTimeS > 0 ? t("days", { days: ratio(stats.totalMovingTimeS / 86_400) }) : undefined,
    },
    {
      key: "activities",
      label: t("activities"),
      value: stats && format.number(stats.count),
      detail: overview && overview.sports.length > 0 ? t("sports", { count: overview.sports.length }) : undefined,
    },
  ];

  return (
    <section
      // Dark whatever the theme, as the headline widget of the achievements.
      className="relative isolate overflow-hidden rounded-2xl bg-linear-to-br from-zinc-800 to-zinc-950 p-5 text-zinc-50 ring-1 ring-white/10 sm:p-7"
    >
      <HeroBackdrop />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {/* Same target as the greeting, so kept out of the tab order. */}
            <Link href={routes.profiles} tabIndex={-1} aria-hidden className="shrink-0 rounded-full transition-opacity hover:opacity-80">
              <UserAvatar user={user} className="size-14 ring-2 ring-white/15 sm:size-16" fallbackClassName="text-lg" />
            </Link>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                {format.dateTime(now, { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                <Link href={routes.profiles} className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none">
                  {t(greeting, { name: publicNameOf(user) })}
                </Link>
              </h1>
              <div className="text-sm text-zinc-400">
                {welcome ? (
                  t("welcome")
                ) : !overview ? (
                  <Skeleton className="mt-1 h-4 w-56 max-w-full bg-white/10" />
                ) : latest ? (
                  t.rich("latest", {
                    name: latest.name,
                    when: format.relativeTime(new Date(latest.startedAt), now),
                    strong: (chunks) => <span className="font-medium text-zinc-200">{chunks}</span>,
                  })
                ) : (
                  t("noActivity")
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" nativeButton={false} render={<Link href={routes.map} />}>
              <MapIcon />
              {t("map")}
            </Button>
            <Button
              variant="ghost"
              className="text-zinc-50 hover:bg-white/10 hover:text-zinc-50 dark:hover:bg-white/10"
              nativeButton={false}
              render={<Link href={routes.achievements} />}
            >
              <TrophyIcon />
              {t("achievements")}
            </Button>
          </div>
        </div>
        {!welcome && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-white/10 pt-5 sm:grid-cols-4">
          {figures.map(({ key, label, value, detail }) => (
            <div key={key} className="flex min-w-0 flex-col gap-0.5">
              <dt className="truncate text-[11px] font-medium tracking-wide text-zinc-400 uppercase">{label}</dt>
              <dd className="flex min-w-0 flex-col">
                {value === null ? (
                  <Skeleton className="my-1 h-7 w-24 bg-white/10" />
                ) : (
                  <span className="truncate text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</span>
                )}
                <span className="truncate text-xs text-zinc-400 tabular-nums">{detail ?? "\u00a0"}</span>
              </dd>
            </div>
          ))}
        </dl>
        )}
      </div>
    </section>
  );
}

/** A grid of tiles crossed by a railway, fading toward the left: a nod to the map. */
export function HeroBackdrop({ id = "dashboard-hero-tiles" }: { id?: string }) {
  return (
    <svg
      aria-hidden
      className="absolute inset-y-0 right-0 -z-10 h-full w-2/3 text-green-500 mask-[linear-gradient(to_left,black,transparent)]"
    >
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect x="1" y="1" width="26" height="26" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.14" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {HIGHLIGHTED.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * 28 + 1} y={y * 28 + 1} width="26" height="26" rx="3" fill="currentColor" fillOpacity="0.16" />
      ))}
      <g className="text-pink-500">
        <path d={RAILWAY} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="9" strokeLinecap="round" />
        <path d={RAILWAY} fill="none" stroke="currentColor" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
        {STATIONS.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" className="fill-zinc-900" stroke="currentColor" strokeWidth="2.5" />
        ))}
      </g>
    </svg>
  );
}

/** Railway of the backdrop, between the actions and the figures, and the stations along it. */
const RAILWAY = "M -20 30 C 120 30, 200 92, 340 92 S 560 66, 700 80 S 900 100, 1000 90";
const STATIONS: [number, number][] = [
  [340, 92],
  [700, 80],
];

/** Tiles of the backdrop shown as visited, counted from its top left. */
const HIGHLIGHTED: [number, number][] = [
  [9, 1], [10, 1], [8, 2], [9, 2], [10, 2], [11, 2], [9, 3], [10, 3], [12, 3], [10, 4], [11, 4], [11, 5], [12, 5], [13, 5], [6, 3], [7, 3],
];

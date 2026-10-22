"use client";

import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LockIcon,
  MapPinIcon,
  Share2Icon,
  TrainFrontIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { FollowCounts } from "@/components/community/follow-counts";
import { BadgeMedal } from "@/components/distances/badge-medal";
import { FamilyIcon } from "@/components/distances/family-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { routes } from "@/config/routes";
import type { ProfileBadge, ProfileShowcase, PublicProfile, TileFigures } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { Distinctions } from "./distinctions";
import { EXPORT_IGNORE } from "./card-image";
import { CardImageDialog } from "./card-image-dialog";
import { ProfileBanner } from "./profile-banner";
import { type ProfileColorStyles, profileColorStyles } from "./profile-color";
import { ShareProfileDialog } from "./share-profile-dialog";
import { ShowcaseDialog } from "./showcase-dialog";

interface ProfileCardProps {
  profile: PublicProfile;
  /** Button beside the avatar: follow, or edit one's own profile. */
  action: ReactNode;
  /** Called once the dialog of the follows closes: they may have changed meanwhile. */
  onFollowsClosed?: () => void;
}

/** Glass buttons over the banner, readable whatever its hue. */
const BANNER_BUTTON =
  "bg-black/25 text-white backdrop-blur-sm hover:bg-black/40 hover:text-white dark:hover:bg-black/40";

/** A profile as every user sees it: who they are, who follows whom, and their showcase unless private. */
export function ProfileCard({ profile, action, onFollowsClosed }: ProfileCardProps) {
  const t = useTranslations("profile");
  const tCommunity = useTranslations("community");
  const tFamilies = useTranslations("distances.families");
  const format = useFormatter();
  const memberSince = format.dateTime(new Date(profile.createdAt), { month: "long", year: "numeric" });
  const card = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [picturing, setPicturing] = useState(false);
  const name = publicNameOf(profile);
  const colors = profileColorStyles(profile.color);

  return (
    <Card ref={card} className="relative isolate gap-0 overflow-hidden border-2 py-0 shadow-xl ring-0" style={colors.border}>
      <div className="pointer-events-none absolute inset-x-0 top-28 bottom-0 -z-10" style={colors.veil} aria-hidden />
      <ProfileBanner seed={profile.username} style={colors.banner} className="h-28" />
      <div className="absolute top-3 right-3 flex gap-1.5" {...EXPORT_IGNORE}>
        <Button
          variant="ghost"
          size="icon-sm"
          className={BANNER_BUTTON}
          onClick={() => setSharing(true)}
          aria-label={t("share.open")}
          title={t("share.open")}
        >
          <Share2Icon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className={BANNER_BUTTON}
          onClick={() => setPicturing(true)}
          aria-label={t("image.open")}
          title={t("image.open")}
        >
          <DownloadIcon />
        </Button>
      </div>
      <div className="flex flex-col gap-4 px-5 pb-6">
        <div className="-mt-12 flex items-end justify-between gap-3">
          <UserAvatar
            user={profile}
            className="size-24 shrink-0 shadow-lg ring-4 ring-card"
            fallbackClassName="text-3xl"
          />
          <div className="min-w-0" {...EXPORT_IGNORE}>
            {action}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="flex min-w-0 items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="truncate">{name}</span>
            {profile.private && (
              <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-label={t("private")} />
            )}
          </h1>
          <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
            <span className="truncate">@{profile.username}</span>
            {profile.followsViewer && <Badge variant="secondary">{tCommunity("follow.followsYou")}</Badge>}
          </p>
        </div>
        <Distinctions distinctions={profile.distinctions} />
        {profile.bio && <p className="break-words whitespace-pre-line">{profile.bio}</p>}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {profile.city && (
            <li className="flex min-w-0 items-center gap-1.5">
              <MapPinIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{profile.city}</span>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            {t("memberSince", { date: memberSince })}
          </li>
        </ul>
        {profile.favoriteSports.length > 0 && (
          <ul
            className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground"
            aria-label={t("favoriteSports")}
          >
            {profile.favoriteSports.map((sport) => (
              <li key={sport} className="flex items-center gap-1.5">
                <FamilyIcon family={sport} className="size-4 shrink-0" aria-hidden />
                {tFamilies(sport)}
              </li>
            ))}
          </ul>
        )}
        <FollowCounts
          username={profile.username}
          counts={{ followers: profile.followersCount, following: profile.followingCount }}
          locked={!profile.visible}
          onDialogClosed={onFollowsClosed}
        />
      </div>
      {profile.visible ? (
        profile.showcase && <ShowcaseView showcase={profile.showcase} self={profile.self} colors={colors} />
      ) : (
        <div className="flex flex-col items-center gap-2 border-t bg-muted/40 px-5 py-10 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <LockIcon className="size-5" aria-hidden />
          </span>
          <p className="font-medium">{t("locked.title")}</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {profile.requested
              ? t("locked.requested")
              : t("locked.description", { name })}
          </p>
        </div>
      )}
      <ShareProfileDialog username={profile.username} name={name} open={sharing} onOpenChange={setSharing} />
      {picturing && (
        <CardImageDialog
          card={card}
          color={profile.color}
          username={profile.username}
          open
          onOpenChange={setPicturing}
        />
      )}
    </Card>
  );
}

/** Widgets of the tiles and stations, then the badges pinned to the profile. */
function ShowcaseView({
  showcase,
  self,
  colors,
}: {
  showcase: ProfileShowcase;
  self: boolean;
  colors: ProfileColorStyles;
}) {
  const t = useTranslations("profile.showcase");
  const { tiles, stations, badges } = showcase;
  const [opened, setOpened] = useState<ProfileBadge | null>(null);

  return (
    <div className="flex flex-col gap-6 border-t px-5 py-6">
      <div className="grid grid-cols-2 gap-3">
        <TilesWidget tiles={tiles} colors={colors} />
        <StationsWidget stations={stations} />
      </div>
      {(badges.length > 0 || self) && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-baseline gap-2 font-medium">
            {t("badges")}
            {badges.length > 0 && <span className="text-sm text-muted-foreground tabular-nums">{badges.length}</span>}
          </h2>
          {badges.length > 0 ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
              {badges.map((badge, index) => (
                <li key={badge.id}>
                  <button
                    type="button"
                    onClick={() => setOpened(badge)}
                    aria-haspopup="dialog"
                    aria-label={badge.name}
                    className="flex w-full flex-col items-center gap-2 rounded-xl p-2 text-center outline-none transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <BadgeMedal badge={badge} index={index} />
                    <span className="line-clamp-2 text-xs leading-tight">{badge.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.rich("noBadges", {
                link: (chunks) => (
                  <Link href={routes.achievements} className="underline underline-offset-4 hover:text-foreground">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </section>
      )}
      {opened && <BadgeDialog badge={opened} self={self} onClose={() => setOpened(null)} />}
    </div>
  );
}

const TILE_LEVELS = ["large", "small"] as const;

/** Lift of the widgets under the pointer, as on the dashboard. */
const WIDGET_HOVER =
  "transition-[box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none";

/** Tiles explored at one level, the chevrons switching between the large and the small ones. */
function TilesWidget({ tiles, colors }: { tiles: ProfileShowcase["tiles"]; colors: ProfileColorStyles }) {
  const t = useTranslations("profile.showcase");
  const tExploration = useTranslations("dashboard.exploration");
  const format = useFormatter();
  const [index, setIndex] = useState(0);
  const level = TILE_LEVELS[index];
  const figures: TileFigures = tiles[level];
  const chevron = "size-6 text-current hover:bg-white/15 hover:text-current disabled:opacity-30 dark:hover:bg-white/15";

  return (
    <div
      // In the hue of the profile.
      className={cn("flex flex-col gap-2 rounded-xl p-3 ring-1 ring-black/10", WIDGET_HOVER)}
      style={colors.widget}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs" style={colors.soft} aria-live="polite">
          <span className="size-2 shrink-0 rounded-xs bg-green-500" aria-hidden />
          {tExploration(level === "large" ? "tiles" : "subtiles")}
        </span>
        <span className="-my-1 -mr-1 flex" {...EXPORT_IGNORE}>
          <Button
            size="icon-xs"
            variant="ghost"
            className={chevron}
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            aria-label={t("previousLevel")}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className={chevron}
            disabled={index === TILE_LEVELS.length - 1}
            onClick={() => setIndex(index + 1)}
            aria-label={t("nextLevel")}
          >
            <ChevronRightIcon />
          </Button>
        </span>
      </div>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{format.number(figures.visited)}</span>
      <dl className="flex flex-col gap-0.5 text-xs" style={colors.soft}>
        <div className="flex justify-between gap-2">
          <dt className="truncate">{tExploration("maxSquare")}</dt>
          <dd className="shrink-0 font-medium tabular-nums" style={{ color: colors.widget.color }}>
            {tExploration("squareSize", { size: figures.maxSquare })}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="truncate">{tExploration("maxCluster")}</dt>
          <dd className="shrink-0 font-medium tabular-nums" style={{ color: colors.widget.color }}>{format.number(figures.maxCluster)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Railway unlocked between the stations visited, and their count. */
function StationsWidget({ stations }: { stations: ProfileShowcase["stations"] }) {
  const t = useTranslations("profile.showcase");
  const format = useFormatter();

  return (
    <div
      // Dark whatever the theme, as the stations widget of the dashboard.
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-linear-to-br from-zinc-800 to-zinc-950 p-3 text-zinc-50 ring-1 ring-white/10",
        WIDGET_HOVER,
      )}
    >
      <span className="flex h-6 items-center gap-1.5 text-xs text-zinc-400">
        <TrainFrontIcon className="size-3.5" aria-hidden />
        {t("railway")}
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        {format.number(stations.unlockedKm, { style: "unit", unit: "kilometer" })}
      </span>
      <dl className="flex flex-col gap-0.5 text-xs text-zinc-400">
        <div className="flex justify-between gap-2">
          <dt className="truncate">{t("stationsVisited")}</dt>
          <dd className="shrink-0 font-medium text-zinc-50 tabular-nums">{format.number(stations.visited)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Details of a pinned badge: its level or completions, never the amounts behind them. */
function BadgeDialog({ badge, self, onClose }: { badge: ProfileBadge; self: boolean; onClose: () => void }) {
  const t = useTranslations("profile.showcase");
  const tFamilies = useTranslations("distances.families");
  const format = useFormatter();
  const status =
    badge.completions === 0
      ? t("badgeProgress", { percent: format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" }) })
      : badge.tiers
        ? t("badgeLevel", { level: badge.completions })
        : t("badgeCompletions", { count: badge.completions });

  return (
    <ShowcaseDialog
      open
      onOpenChange={(open) => !open && onClose()}
      media={<BadgeMedal badge={badge} index={0} className="w-24" />}
      title={badge.name}
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <FamilyIcon family={badge.family} className="size-3.5" aria-hidden />
          {tFamilies(badge.family)} · {status}
        </span>
      }
      description={badge.description}
      footer={
        self && (
          <Button variant="outline" nativeButton={false} render={<Link href={routes.achievements} />}>
            {t("openAchievements")}
          </Button>
        )
      }
    />
  );
}

export function ProfileCardSkeleton() {
  return (
    <Card aria-busy className="gap-0 overflow-hidden py-0 shadow-xl">
      <Skeleton className="h-28 rounded-none" />
      <div className="flex flex-col gap-4 px-5 pb-6">
        <div className="-mt-12 flex items-end justify-between">
          <Skeleton className="size-24 rounded-full ring-4 ring-card" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid gap-3 border-t px-5 py-6">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </Card>
  );
}

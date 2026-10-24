"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LockIcon,
  Share2Icon,
  TrainFrontIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ReactNode, useRef, useState } from "react";
import { FollowCounts } from "@/components/community/follow-counts";
import { AppWordmark } from "@/components/brand/app-logo";
import { BadgeMedal } from "@/components/distances/badge-medal";
import { FamilyIcon } from "@/components/distances/family-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import type { ProfileBadge, ProfileShowcase, PublicProfile, TileFigures } from "@/lib/api/types";
import { countryName } from "@/lib/countries/country-format";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { Distinctions } from "./distinctions";
import { EXPORT_IGNORE } from "./card-image";
import { LikeButton } from "./like-button";
import { CardImageDialog } from "./card-image-dialog";
import { ProfileBanner } from "./profile-banner";
import { DEFAULT_PROFILE_COLOR, type ProfileColorStyles, profileColorStyles } from "./profile-color";
import { ShareProfileDialog } from "./share-profile-dialog";
import { ShowcaseDialog } from "./showcase-dialog";

interface ProfileCardProps {
  profile: PublicProfile;
  /** Button beside the avatar: follow, or edit one's own profile. */
  action: ReactNode;
  /** Called once the dialog of the follows closes: they may have changed meanwhile. */
  onFollowsClosed?: () => void;
  /** Outside of the follows of the current user: drawn with a dashed border. */
  outside?: boolean;
}

/** Glass buttons over the banner, readable whatever its hue. */
const BANNER_BUTTON =
  "bg-black/25 text-white backdrop-blur-sm hover:bg-black/40 hover:text-white dark:hover:bg-black/40";

/** A profile as every user sees it: who they are, who follows whom, and their showcase unless private. */
export function ProfileCard({ profile, action, onFollowsClosed, outside = false }: ProfileCardProps) {
  const t = useTranslations("profile");
  const tCommunity = useTranslations("community");
  const tFamilies = useTranslations("distances.families");
  const format = useFormatter();
  const locale = useLocale();
  const memberSince = format.dateTime(new Date(profile.createdAt), { month: "short", year: "numeric" });
  const place = profile.city && [profile.city, profile.countryCode && countryName(profile.countryCode, locale)].filter(Boolean).join(", ");
  const card = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [picturing, setPicturing] = useState(false);
  const name = publicNameOf(profile);
  const colors = profileColorStyles(profile.color);

  return (
    <Card
      ref={card}
      className={cn(
        "relative isolate h-full gap-0 overflow-hidden border-2 py-0 shadow-xl ring-0",
        outside && "border-[3px] border-dashed",
      )}
      // The dashes in the full hue, to stand out.
      style={outside ? { borderColor: profile.color ?? DEFAULT_PROFILE_COLOR } : colors.border}
    >
      <div className="pointer-events-none absolute inset-x-0 top-24 bottom-0 -z-10" style={colors.veil} aria-hidden />
      <ProfileBanner seed={profile.username} style={colors.banner} className="h-24" />
      <span className="absolute top-3.5 left-4 flex items-center gap-1 text-[10px] text-white/90">
        <siteConfig.logo className="size-3.5" aria-hidden />
        <span className="flex items-baseline">
          <AppWordmark />
          <span className="font-semibold">{siteConfig.domain.slice(siteConfig.name.length)}</span>
        </span>
      </span>
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
        {profile.self && (
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
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <UserAvatar
            user={profile}
            className="size-20 shrink-0 shadow-lg ring-4 ring-card"
            fallbackClassName="text-2xl"
          />
          <div className="flex min-w-0 items-center gap-2" {...EXPORT_IGNORE}>
            <LikeButton
              key={profile.username}
              username={profile.username}
              liked={profile.liked}
              count={profile.likesCount}
              self={profile.self}
            />
            {action}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
            <span className="truncate">{name}</span>
            {profile.private && (
              <LockIcon className="size-4 shrink-0 text-muted-foreground" aria-label={t("private")} />
            )}
            {profile.followsViewer && (
              <Badge variant="secondary" className="shrink-0 font-normal">
                {tCommunity("follow.followsYou")}
              </Badge>
            )}
          </h1>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">@{profile.username}</span>
            {place && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{place}</span>
              </>
            )}
            <span aria-hidden>·</span>
            <span className="shrink-0" title={t("memberSince")}>
              {memberSince}
            </span>
          </p>
        </div>
        {/* Sections keep their height, a missing one is said so: every card of the deck has the same layout. */}
        <Distinctions distinctions={profile.distinctions} className="h-6" />
        <p
          className={cn(
            "line-clamp-2 min-h-[2lh] text-sm wrap-break-word whitespace-pre-line",
            !profile.bio && "text-muted-foreground italic",
          )}
        >
          {profile.bio ?? t("empty.bio")}
        </p>
        <ul
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          aria-label={t("favoriteSports")}
        >
          {profile.favoriteSports.length === 0 ? (
            <li className="italic">{t("empty.sports")}</li>
          ) : (
            profile.favoriteSports.map((sport) => (
              <li key={sport} className="flex items-center gap-1">
                <FamilyIcon family={sport} className="size-3.5 shrink-0" aria-hidden />
                {tFamilies(sport)}
              </li>
            ))
          )}
        </ul>
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
        <div className="flex flex-1 flex-col items-center justify-center gap-2 border-t bg-muted/40 px-5 py-8 text-center">
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
    <div className="flex flex-1 flex-col gap-4 border-t px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <TilesWidget tiles={tiles} colors={colors} />
        <StationsWidget stations={stations} />
      </div>
      <section className="flex min-h-22 flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-sm font-medium">
            {t("badges")}
            {badges.length > 0 && <span className="text-xs text-muted-foreground tabular-nums">{badges.length}</span>}
          </h2>
          {badges.length > 0 ? (
            // Up to five badges, as many as a profile shows, on one row.
            <ul className="grid grid-cols-5 gap-1">
              {badges.map((badge, index) => (
                <li key={badge.id}>
                  <button
                    type="button"
                    onClick={() => setOpened(badge)}
                    aria-haspopup="dialog"
                    aria-label={badge.name}
                    className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg px-0.5 py-1 text-center outline-none transition-[background-color,translate] hover:-translate-y-0.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <BadgeMedal badge={badge} index={index} className="w-11" />
                    <span className="w-full truncate text-[10px] leading-tight">{badge.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !self ? (
            <p className="text-xs text-muted-foreground italic">{t("noBadgesOther")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
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
    <Card aria-busy className="h-full gap-0 overflow-hidden py-0 shadow-xl">
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

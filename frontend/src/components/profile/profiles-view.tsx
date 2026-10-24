"use client";

import { EyeIcon, EyeOffIcon, LayersIcon, PencilIcon, UndoIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { FollowButton, type FollowState, followStateOf } from "@/components/community/follow-button";
import { useFollowsSummary } from "@/components/community/follows-summary-provider";
import { RequestAnswerButtons } from "@/components/community/request-answer-buttons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/components/user/user-provider";
import { PROFILE_PARAM, routes, userProfileHref } from "@/config/routes";
import { usePublicProfile } from "@/hooks/use-public-profile";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import type { ProfileSummary, PublicProfile } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { profilesService } from "@/services/profiles.service";
import { FollowRequestsDialog } from "./follow-requests-dialog";
import { ProfileCard, ProfileCardSkeleton } from "./profile-card";
import { ProfileColorButton } from "./profile-color-button";
import { type DeckItem, ProfileDeck } from "./profile-deck";
import { ProfileSearchDialog } from "./profile-search-dialog";
import { ProfileStage } from "./profile-stage";
import { ProfileVisibilitySwitch } from "./profile-visibility-switch";

/** Key of the card standing for the follows while there are none. */
const EMPTY_KEY = "~empty";

/**
 * The profile of the current user, as others see it, with its visibility, its
 * hue, a search and the follow requests; then, in the same deck, the cards of
 * the users they follow. The card shown is named in the URL: any other user
 * is shown in front of the deck, which is blurred behind.
 */
export function ProfilesView() {
  const t = useTranslations("profile");
  const user = useCurrentUser();
  const asked = useSearchParams().get(PROFILE_PARAM)?.toLowerCase() || null;
  /** The user shown, unless it is the current one. */
  const shownName = asked === user.username ? null : asked;
  const { profile, refresh } = usePublicProfile(user.username);
  const requestsCount = useFollowsSummary().summary?.requestsCount;
  const [lastRequestsCount, setLastRequestsCount] = useState(requestsCount);
  // A request answered elsewhere, e.g. in the notifications, may add a follower.
  if (requestsCount !== lastRequestsCount) {
    setLastRequestsCount(requestsCount);
    if (lastRequestsCount !== undefined && requestsCount !== undefined && requestsCount < lastRequestsCount) refresh();
  }
  /** Hue being picked, shown before it is saved. */
  const [color, setColor] = useState<string | null | undefined>(undefined);
  const [followed, setFollowed] = useState<ProfileSummary[] | null>(null);
  /** Whether the card standing for the follows is shown, which no URL names. */
  const [emptyShown, setEmptyShown] = useState(false);
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    setEmptyShown(false);
  }

  const loadFollowed = useCallback(
    () => profilesService.list(user.username, "following", 0).then(setFollowed, () => setFollowed([])),
    [user.username],
  );
  useEffect(() => {
    void loadFollowed();
  }, [loadFollowed]);

  const followedIndex = shownName && followed ? followed.findIndex(({ username }) => username === shownName) : -1;
  const outside = shownName !== null && followed !== null && followedIndex === -1;
  const index = shownName === null ? (emptyShown ? 1 : 0) : Math.max(followedIndex + 1, 0);
  const others = useProfiles(followed ?? [], index, outside ? shownName : null);

  /** Shows a card of the deck, named in the URL without a new entry in the history. */
  const showCard = (next: number) => {
    const target = next === 0 ? null : (followed?.[next - 1]?.username ?? null);
    setEmptyShown(next !== 0 && target === null);
    window.history.replaceState(null, "", target ? userProfileHref(target) : routes.profiles);
  };

  const otherCard = (other: PublicProfile, onFollowChange: (state: FollowState) => void, isOutside = false) => (
    <ProfileCard
      profile={other}
      outside={isOutside}
      onFollowsClosed={() => others.reload(other.username)}
      action={
        <FollowButton
          username={other.username}
          state={followStateOf(other)}
          followsViewer={other.followsViewer}
          onChange={onFollowChange}
        />
      }
    />
  );

  const items: DeckItem[] = [
    {
      key: user.username,
      label: publicNameOf(user),
      content: profile ? (
        <ProfileCard
          profile={color === undefined ? profile : { ...profile, color }}
          onFollowsClosed={refresh}
          action={
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={routes.settingsProfile} />}>
              <PencilIcon aria-hidden />
              {t("edit")}
            </Button>
          }
        />
      ) : (
        <ProfileCardSkeleton />
      ),
    },
    ...(followed?.length === 0
      ? [{ key: EMPTY_KEY, label: t("deck.empty.title"), content: <EmptyFollowsCard /> }]
      : (followed ?? []).map((summary): DeckItem => {
          const other = others.profiles[summary.username];
          return {
            key: summary.username,
            label: publicNameOf(summary),
            content: other ? (
              otherCard(other, () => others.reload(summary.username))
            ) : (
              <ProfileCardSkeleton />
            ),
          };
        })),
  ];

  const outsider = outside ? others.profiles[shownName] : undefined;
  const outsiderError = outside ? others.errors[shownName] : undefined;
  // Followed from in front of the deck, they join it.
  const onOutsiderFollow = (state: FollowState) => {
    others.reload(shownName!);
    if (state === "following") void loadFollowed();
  };

  const shown = shownName === null ? null : (outsider ?? others.profiles[shownName]);
  const self = shownName === null;
  const shownColor = self ? (color === undefined ? profile?.color : color) : shown?.color;
  // While the follows load, the user named is not known to be among them yet.
  const pending = shownName !== null && followed === null;

  return (
    <ProfileStage
      color={shownColor ?? null}
      top={
        self ? (
          <div className="flex items-center gap-1">
            <ProfileVisibilitySwitch variant="lock" onChange={refresh} />
            {profile && (
              <ProfileColorButton color={color === undefined ? profile.color : color} onPreview={setColor} />
            )}
            <ProfileSearchDialog />
            <FollowRequestsDialog
              onAnswered={(username) => {
                refresh();
                if (username in others.profiles) others.reload(username);
              }}
            />
          </div>
        ) : shown?.requestedViewer ? (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
            <p className="text-sm text-muted-foreground">
              {t.rich("requests.asked", {
                username: shown.username,
                b: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
              })}
            </p>
            <RequestAnswerButtons
              username={shown.username}
              onAnswered={() => {
                others.reload(shown.username);
                refresh();
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-muted-foreground">@{shownName}</p>
            <ProfileSearchDialog />
          </div>
        )
      }
      bottom={
        self ? (
          <p className="max-w-sm text-center text-sm text-balance text-muted-foreground">
            <EyeIcon className="mr-1.5 inline size-4 -translate-y-px" aria-hidden />
            {t("ownHint")}
          </p>
        ) : (
          <Button variant="link" size="sm" onClick={() => showCard(0)}>
            <UndoIcon aria-hidden />
            {t("deck.back")}
          </Button>
        )
      }
    >
      <ProfileDeck
        items={items}
        index={pending || outside ? 0 : index}
        onIndexChange={showCard}
        front={
          pending
            ? { content: <ProfileCardSkeleton />, footer: null }
            : outside
              ? {
                  content: outsider ? (
                    otherCard(outsider, onOutsiderFollow, true)
                  ) : outsiderError ? (
                    <MissingCard error={outsiderError} />
                  ) : (
                    <ProfileCardSkeleton />
                  ),
                  footer: (
                    <p className="flex items-center gap-1.5 text-center text-xs text-balance text-muted-foreground">
                      <EyeOffIcon className="size-3.5 shrink-0" aria-hidden />
                      {t("deck.outside")}
                    </p>
                  ),
                }
              : undefined
        }
      />
    </ProfileStage>
  );
}

/** Stands for the follows while there are none. */
function EmptyFollowsCard() {
  const t = useTranslations("profile.deck.empty");
  return (
    <Card className="h-full items-center justify-center gap-3 border-2 px-8 py-12 text-center shadow-xl ring-0">
      <LayersIcon className="size-8 text-muted-foreground" aria-hidden />
      <p className="font-medium">{t("title")}</p>
      <p className="text-sm text-balance text-muted-foreground">{t("description")}</p>
    </Card>
  );
}

/** In place of a profile that could not be loaded. */
function MissingCard({ error }: { error: ApiErrorCode }) {
  const t = useTranslations("community.profile");
  return (
    <Card className="h-full min-h-64 items-center justify-center border-2 border-dashed px-8 text-center shadow-xl ring-0">
      <p className="text-sm text-muted-foreground">{t(error === "NOT_FOUND" ? "notFound" : "error")}</p>
    </Card>
  );
}

/**
 * Profiles of the followed users, fetched once their card is shown or next to
 * it, and of the user shown in front of the deck, if any.
 */
function useProfiles(users: ProfileSummary[], index: number, front: string | null) {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [errors, setErrors] = useState<Record<string, ApiErrorCode>>({});

  const reload = useCallback((username: string) => {
    profilesService.get(username).then(
      (profile) => setProfiles((current) => ({ ...current, [username]: profile })),
      (error: unknown) => setErrors((current) => ({ ...current, [username]: errorCodeOf(error) })),
    );
  }, []);

  useEffect(() => {
    if (front && !(front in profiles) && !(front in errors)) reload(front);
  }, [front, profiles, errors, reload]);

  useEffect(() => {
    // The own card comes first in the deck: the followed users start at 1.
    const count = users.length + 1;
    // The shown card, the peeking ones and those about to come in.
    for (let deckIndex = index - 2; deckIndex <= index + 2; deckIndex++) {
      const user = users[((deckIndex % count) + count) % count - 1];
      if (user && !(user.username in profiles)) reload(user.username);
    }
  }, [users, index, profiles, reload]);

  return { profiles, errors, reload };
}

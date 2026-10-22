"use client";

import { EyeIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { FollowButton, followStateOf } from "@/components/community/follow-button";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/components/user/user-provider";
import { routes, userProfileHref } from "@/config/routes";
import { usePublicProfile } from "@/hooks/use-public-profile";
import type { ProfileSummary, PublicProfile } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { profilesService } from "@/services/profiles.service";
import { FollowRequests } from "./follow-requests";
import { ProfileCard, ProfileCardSkeleton } from "./profile-card";
import { ProfileColorButton } from "./profile-color-button";
import { type DeckItem, ProfileDeck } from "./profile-deck";
import { ProfileVisibilitySwitch } from "./profile-visibility-switch";

/**
 * The profile of the current user, as others see it, with its visibility, its
 * hue and the follow requests to answer; then, in the same deck, the cards of
 * the users they follow.
 */
export function OwnProfile() {
  const t = useTranslations("profile");
  const user = useCurrentUser();
  const { profile, refresh } = usePublicProfile(user.username);
  /** Hue being picked, shown before it is saved. */
  const [color, setColor] = useState<string | null | undefined>(undefined);
  const [followed, setFollowed] = useState<ProfileSummary[]>([]);
  const [index, setIndex] = useState(0);
  const others = useProfiles(followed, index);

  useEffect(() => {
    profilesService.list(user.username, "following", 0).then(setFollowed, () => setFollowed([]));
  }, [user.username]);

  const self = index === 0;
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
    ...followed.map((summary): DeckItem => {
      const other = others.profiles[summary.username];
      return {
        key: summary.username,
        label: publicNameOf(summary),
        content: other ? (
          <ProfileCard
            profile={other}
            onFollowsClosed={() => others.reload(summary.username)}
            action={
              <FollowButton
                username={other.username}
                state={followStateOf(other)}
                followsViewer={other.followsViewer}
                onChange={() => others.reload(summary.username)}
              />
            }
          />
        ) : (
          <ProfileCardSkeleton />
        ),
      };
    }),
  ];

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-4 overflow-x-clip">
      {/* Kept while another card is shown, so that the deck does not move. */}
      <div className={self ? "flex items-center gap-3" : "invisible flex items-center gap-3"} aria-hidden={!self}>
        <ProfileVisibilitySwitch onChange={refresh} />
        {profile && <ProfileColorButton color={color === undefined ? profile.color : color} onPreview={setColor} />}
      </div>
      <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 pb-4">
        <ProfileDeck items={items} index={index} onIndexChange={setIndex} />
        {self ? (
          <p className="max-w-sm text-center text-sm text-balance text-muted-foreground">
            <EyeIcon className="mr-1.5 inline size-4 -translate-y-px" aria-hidden />
            {t("ownHint")}
          </p>
        ) : (
          <Button
            variant="link"
            size="sm"
            nativeButton={false}
            render={<Link href={userProfileHref(items[index].key)} />}
          >
            {t("deck.open")}
          </Button>
        )}
        {self && profile && (profile.requestsCount ?? 0) > 0 && (
          <div className="w-full max-w-sm">
            <FollowRequests count={profile.requestsCount ?? 0} onChange={refresh} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Profiles of the followed users, fetched once their card is shown or next to it. */
function useProfiles(users: ProfileSummary[], index: number) {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});

  const reload = useCallback((username: string) => {
    profilesService.get(username).then(
      (profile) => setProfiles((current) => ({ ...current, [username]: profile })),
      () => {},
    );
  }, []);

  useEffect(() => {
    // The own card comes first in the deck: the followed users start at 1.
    const count = users.length + 1;
    for (const deckIndex of [index - 1, index, index + 1]) {
      const user = users[((deckIndex % count) + count) % count - 1];
      if (user && !(user.username in profiles)) reload(user.username);
    }
  }, [users, index, profiles, reload]);

  return { profiles, reload };
}

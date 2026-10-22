"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { ProfileCard, ProfileCardSkeleton } from "@/components/profile/profile-card";
import { CARD_WIDTH, ProfileStage } from "@/components/profile/profile-stage";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { usePublicProfile } from "@/hooks/use-public-profile";
import { FollowButton, followStateOf } from "./follow-button";

/** Profile of another user, with a button to follow them, or to ask to when it is private. */
export function PublicProfileView({ username }: { username: string }) {
  const t = useTranslations("community");
  const router = useRouter();
  const { profile, error, retry, refresh, showFollowState } = usePublicProfile(username);

  // The current user has their own profile page.
  useEffect(() => {
    if (profile?.self) router.replace(routes.profile);
  }, [profile?.self, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-muted-foreground">{t(error === "NOT_FOUND" ? "profile.notFound" : "profile.error")}</p>
        {error !== "NOT_FOUND" && (
          <Button variant="outline" size="sm" onClick={retry}>
            {t("profile.retry")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <ProfileStage
      top={<p className="text-sm font-medium text-muted-foreground">@{username}</p>}
      color={profile?.color ?? null}
    >
      <div className={CARD_WIDTH}>
        {!profile || profile.self ? (
          <ProfileCardSkeleton />
        ) : (
          <ProfileCard
            profile={profile}
            onFollowsClosed={refresh}
            action={
              <FollowButton
                username={profile.username}
                state={followStateOf(profile)}
                followsViewer={profile.followsViewer}
                onChange={showFollowState}
              />
            }
          />
        )}
      </div>
    </ProfileStage>
  );
}

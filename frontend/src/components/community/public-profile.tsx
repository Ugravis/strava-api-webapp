"use client";

import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { routes } from "@/config/routes";
import { usePublicProfile } from "@/hooks/use-public-profile";
import { publicNameOf } from "@/lib/user";
import { FollowButton } from "./follow-button";
import { FollowCounts } from "./follow-counts";

/** Public profile of another user: who they are, who follows whom, and a button to follow them. */
export function PublicProfileView({ username }: { username: string }) {
  const t = useTranslations("community");
  const tProfile = useTranslations("profile");
  const format = useFormatter();
  const router = useRouter();
  const { profile, error, retry, showFollowed } = usePublicProfile(username);

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

  if (!profile || profile.self) {
    return <PublicProfileSkeleton />;
  }

  const memberSince = format.dateTime(new Date(profile.createdAt), { month: "long", year: "numeric" });

  return (
    <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
      <UserAvatar user={profile} className="size-24 sm:size-20" fallbackClassName="text-2xl" />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:items-start">
        <h1 className="max-w-full truncate text-2xl font-semibold tracking-tight">{publicNameOf(profile)}</h1>
        <p className="flex max-w-full items-center gap-2 text-muted-foreground">
          <span className="truncate">@{profile.username}</span>
          {profile.followsViewer && <Badge variant="secondary">{t("follow.followsYou")}</Badge>}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarIcon className="size-4" aria-hidden />
          {tProfile("memberSince", { date: memberSince })}
        </p>
        <FollowCounts
          username={profile.username}
          counts={{ followers: profile.followersCount, following: profile.followingCount }}
          className="mt-1"
        />
      </div>
      <FollowButton
        username={profile.username}
        followed={profile.followed}
        followsViewer={profile.followsViewer}
        onChange={showFollowed}
        size="default"
        className="w-full sm:w-auto"
      />
    </section>
  );
}

export function PublicProfileSkeleton() {
  return (
    <section aria-busy className="flex flex-col items-center gap-4 sm:flex-row">
      <Skeleton className="size-24 rounded-full sm:size-20" />
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-48" />
      </div>
    </section>
  );
}

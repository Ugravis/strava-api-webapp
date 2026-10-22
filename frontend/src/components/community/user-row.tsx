"use client";

import Link from "next/link";
import { type ReactNode, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/components/user/user-provider";
import { userProfileHref } from "@/config/routes";
import type { ProfileSummary } from "@/lib/api/types";
import { publicNameOf } from "@/lib/user";
import { FollowButton, followStateOf } from "./follow-button";

/**
 * A user in a list: a link to their profile, and a button to follow them
 * unless it is the current user, or other actions in its place.
 */
export function UserRow({ user, actions }: { user: ProfileSummary; actions?: ReactNode }) {
  const currentUser = useCurrentUser();
  const [followState, setFollowState] = useState(() => followStateOf(user));

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Link
        href={userProfileHref(user.username)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar user={user} className="size-10" />
        <span className="grid min-w-0 leading-tight">
          <span className="truncate font-medium">{publicNameOf(user)}</span>
          <span className="truncate text-sm text-muted-foreground">@{user.username}</span>
        </span>
      </Link>
      {actions ?? (user.id !== currentUser.id && (
        <FollowButton username={user.username} state={followState} onChange={setFollowState} />
      ))}
    </li>
  );
}

/** Placeholder rows while a list loads. */
export function UserRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul aria-busy className="divide-y">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-20" />
        </li>
      ))}
    </ul>
  );
}

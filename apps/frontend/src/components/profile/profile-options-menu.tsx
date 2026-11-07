"use client";

import { ClockIcon, EllipsisIcon, FlagIcon, HeartIcon, UserMinusIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { type FollowState, followStateOf, useFollowAction } from "@/components/community/follow-button";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PublicProfile } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { useProfileLike } from "./like-button";
import { ReportUserDialog } from "./report-user-dialog";

interface ProfileOptionsMenuProps {
  profile: PublicProfile;
  /** The like of the card, kept in step with its heart. */
  like: ReturnType<typeof useProfileLike>;
  onFollowChange?: (state: FollowState) => void;
  buttonClassName?: string;
}

/** What one can do on the profile of someone else: follow, like, report. */
export function ProfileOptionsMenu({ profile, like, onFollowChange, buttonClassName }: ProfileOptionsMenuProps) {
  const t = useTranslations("profile.options");
  const state = followStateOf(profile);
  const follow = useFollowAction(profile.username, state, onFollowChange);
  const [reporting, setReporting] = useState(false);
  // Sent from this card, until the profile is read again.
  const [reportedName, setReportedName] = useState<string | null>(null);
  const reported = profile.reported || reportedName === profile.username;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className={buttonClassName} aria-label={t("open")} title={t("open")} />}
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled={follow.pending} onClick={follow.request}>
            {state === "none" ? <UserPlusIcon /> : state === "following" ? <UserMinusIcon /> : <ClockIcon />}
            {state === "none" ? t(profile.followsViewer ? "followBack" : "follow") : t(state === "following" ? "unfollow" : "cancelRequest")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={like.pending} onClick={() => void like.toggle()}>
            <HeartIcon className={cn(like.liked && "fill-rose-500 text-rose-500")} />
            {t(like.liked ? "unlike" : "like")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={reported} onClick={() => setReporting(true)}>
            <FlagIcon />
            {t(reported ? "reported" : "report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {follow.dialog}
      <ReportUserDialog username={profile.username} open={reporting} onOpenChange={setReporting} onReported={() => setReportedName(profile.username)} />
    </>
  );
}

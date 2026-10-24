"use client";

import { ClockIcon, UserCheckIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { errorCodeOf } from "@/lib/api/errors";
import type { ProfileSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";
import { useFollowsSummary } from "./follows-summary-provider";

/** Whether the current user follows a user, asked to follow their private profile, or neither. */
export type FollowState = "none" | "requested" | "following";

export const followStateOf = ({ followed, requested }: Pick<ProfileSummary, "followed" | "requested">): FollowState =>
  followed ? "following" : requested ? "requested" : "none";

interface FollowButtonProps {
  username: string;
  state: FollowState;
  /** Whether they follow the current user: offers to follow back. */
  followsViewer?: boolean;
  /** Called with the new state, and with the previous one if the server refuses. */
  onChange?: (state: FollowState) => void;
  size?: "sm" | "default";
  className?: string;
}

/**
 * Follows a user, or asks to when their profile is private; unfollows them or
 * cancels the request at once, back as it was if the server refuses.
 */
export function FollowButton({
  username,
  state,
  followsViewer = false,
  onChange,
  size = "sm",
  className,
}: FollowButtonProps) {
  const t = useTranslations("community.follow");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { refresh: refreshSummary } = useFollowsSummary();

  const toggle = async () => {
    setPending(true);
    try {
      if (state === "none") {
        // Whether the profile is private is only known from the answer.
        const { status } = await profilesService.follow(username);
        onChange?.(status);
      } else {
        onChange?.("none");
        try {
          await profilesService.unfollow(username);
        } catch (error) {
          onChange?.(state);
          throw error;
        }
      }
    } catch (error) {
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
      refreshSummary();
    }
  };

  return (
    <>
      <Button
        type="button"
        size={size}
        variant={state === "none" ? "default" : "outline"}
        disabled={pending}
        aria-pressed={state !== "none"}
        // Unfollowing is confirmed first.
        onClick={() => (state === "following" ? setConfirming(true) : void toggle())}
        // Says what a click does once hovered: unfollowing, or cancelling the request.
        className={cn(
          "group/follow shrink-0",
          // Kept within menu items, which recolor their content on focus, down to the icon paths.
          state === "none" && "text-primary-foreground!",
          "**:text-inherit!",
          className,
        )}
      >
        {state === "none" ? (
          <>
            <UserPlusIcon aria-hidden />
            {followsViewer ? t("followBack") : t("follow")}
          </>
        ) : (
          <>
            {state === "following" ? <UserCheckIcon aria-hidden /> : <ClockIcon aria-hidden />}
            <span className="group-hover/follow:hidden">{t(state === "following" ? "following" : "requested")}</span>
            <span className="hidden group-hover/follow:inline">
              {t(state === "following" ? "unfollow" : "cancelRequest")}
            </span>
          </>
        )}
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm.title", { username })}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirm.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirming(false);
                void toggle();
              }}
            >
              {t("unfollow")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

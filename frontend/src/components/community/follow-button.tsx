"use client";

import { UserCheckIcon, UserPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorCodeOf } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";

interface FollowButtonProps {
  username: string;
  followed: boolean;
  /** Whether they follow the current user: offers to follow back. */
  followsViewer?: boolean;
  /** Called at once with the new state, and with the previous one if the server refuses. */
  onChange?: (followed: boolean) => void;
  size?: "sm" | "default";
  className?: string;
}

/** Follows or unfollows a user at once; back as it was if the server refuses. */
export function FollowButton({
  username,
  followed,
  followsViewer = false,
  onChange,
  size = "sm",
  className,
}: FollowButtonProps) {
  const t = useTranslations("community.follow");
  const tErrors = useTranslations("errors");
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    const next = !followed;
    setPending(true);
    onChange?.(next);
    try {
      await (next ? profilesService.follow(username) : profilesService.unfollow(username));
    } catch (error) {
      onChange?.(!next);
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={followed ? "outline" : "default"}
      disabled={pending}
      aria-pressed={followed}
      onClick={() => void toggle()}
      // Says what a click does once hovered: unfollowing.
      className={cn("group/follow shrink-0", className)}
    >
      {followed ? (
        <>
          <UserCheckIcon aria-hidden />
          <span className="group-hover/follow:hidden">{t("following")}</span>
          <span className="hidden group-hover/follow:inline">{t("unfollow")}</span>
        </>
      ) : (
        <>
          <UserPlusIcon aria-hidden />
          {followsViewer ? t("followBack") : t("follow")}
        </>
      )}
    </Button>
  );
}

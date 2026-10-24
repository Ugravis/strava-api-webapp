"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { errorCodeOf } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";
import { useFollowsSummary } from "./follows-summary-provider";

interface RequestAnswerButtonsProps {
  /** Who asked to follow the current user. */
  username: string;
  /** Called once the server took the answer. */
  onAnswered?: (accepted: boolean) => void;
  className?: string;
}

/** Accepts or declines the request of a user to follow the current one. */
export function RequestAnswerButtons({ username, onAnswered, className }: RequestAnswerButtonsProps) {
  const t = useTranslations("profile.requests");
  const tErrors = useTranslations("errors");
  const { refresh } = useFollowsSummary();
  const [pending, setPending] = useState(false);

  const answer = async (event: MouseEvent, accept: boolean) => {
    // Kept from what holds the buttons, e.g. a notification opening the profile.
    event.preventDefault();
    event.stopPropagation();
    setPending(true);
    try {
      await (accept ? profilesService.acceptFollower(username) : profilesService.removeFollower(username));
      onAnswered?.(accept);
    } catch (error) {
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
      refresh();
    }
  };

  return (
    <div className={cn("flex shrink-0 gap-1.5", className)}>
      <Button
        size="sm"
        disabled={pending}
        onClick={(event) => void answer(event, true)}
        // Kept within menu items, which recolor their content on focus.
        className="text-primary-foreground! *:text-primary-foreground!"
      >
        <CheckIcon aria-hidden />
        {t("accept")}
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        disabled={pending}
        onClick={(event) => void answer(event, false)}
        aria-label={t("decline")}
        title={t("decline")}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}

"use client";

import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RequestAnswerButtons } from "@/components/community/request-answer-buttons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowRequestBoxProps {
  username: string;
  onAnswered: () => void;
  /** Leaves the request for later. */
  onClose: () => void;
}

/**
 * The request of a user to follow the current one, to answer, over the top
 * of their card: as tall as the line it takes the place of, so that the card
 * does not move, the box overlapping it if need be. Folded, only the buttons
 * are left.
 */
export function FollowRequestBox({ username, onAnswered, onClose }: FollowRequestBoxProps) {
  const t = useTranslations("profile.requests");
  const [folded, setFolded] = useState(false);

  const fold = (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={() => setFolded(!folded)}
      aria-expanded={!folded}
      aria-label={t(folded ? "unfold" : "fold")}
      title={t(folded ? "unfold" : "fold")}
      className={cn("text-muted-foreground", !folded && "absolute top-1.5 left-1.5")}
    >
      {folded ? <ChevronDownIcon /> : <ChevronUpIcon />}
    </Button>
  );
  const close = (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={onClose}
      aria-label={t("later")}
      title={t("later")}
      className={cn("text-muted-foreground", !folded && "absolute top-1.5 right-1.5")}
    >
      <XIcon />
    </Button>
  );

  return (
    <div className="relative h-8">
      <div
        className={cn(
          "absolute top-0 left-1/2 z-40 flex w-max -translate-x-1/2 items-center rounded-xl border bg-popover/95 text-center shadow-lg backdrop-blur-sm",
          folded ? "gap-1.5 p-1.5" : "max-w-60 flex-col gap-2.5 px-7 pt-3 pb-3",
        )}
      >
        {fold}
        {!folded && (
          <p className="text-sm text-balance text-muted-foreground">
            {t.rich("asked", { username, b: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })}
          </p>
        )}
        <RequestAnswerButtons username={username} onAnswered={onAnswered} />
        {close}
      </div>
    </div>
  );
}

"use client";

import { HeartIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { errorCodeOf } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";

interface LikeButtonProps {
  username: string;
  liked: boolean;
  count: number;
  /** One's own profile: the count alone, nothing to like. */
  self: boolean;
}

/** Heart liking a profile, once per user, with its count; who likes it is never told. */
export function LikeButton({ username, liked: initiallyLiked, count: initialCount, self }: LikeButtonProps) {
  const t = useTranslations("profile.likes");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const [liked, setLiked] = useState(initiallyLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = async () => {
    const next = !liked;
    setLiked(next);
    setCount((current) => current + (next ? 1 : -1));
    setPending(true);
    try {
      await (next ? profilesService.like(username) : profilesService.unlike(username));
    } catch (error) {
      setLiked(!next);
      setCount((current) => current + (next ? -1 : 1));
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
    }
  };

  const content = (
    <>
      <HeartIcon className={cn(liked && "fill-rose-500 text-rose-500")} aria-hidden />
      <span className="tabular-nums">{format.number(count)}</span>
    </>
  );
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          self ? (
            <span
              tabIndex={0}
              aria-label={t("count", { count })}
              className="inline-flex h-7 items-center gap-1 px-2 text-sm font-medium [&_svg]:size-4"
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              aria-pressed={liked}
              aria-label={t(liked ? "unlike" : "like", { count })}
              onClick={() => void toggle()}
            />
          )
        }
      >
        {content}
      </TooltipTrigger>
      <TooltipContent>{t(self ? "anonymousOwn" : "anonymous")}</TooltipContent>
    </Tooltip>
  );
}

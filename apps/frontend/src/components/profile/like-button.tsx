"use client";

import { HeartIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kilotrace/ui/components/ui/tooltip";
import { errorCodeOf } from "@/lib/api/errors";
import { cn } from "@kilotrace/ui/lib/utils";
import { profilesService } from "@/services/profiles.service";

/** Likes or unlikes a profile at once, back as it was if the server refuses. Reset for another profile. */
export function useProfileLike(username: string, initiallyLiked: boolean, initialCount: number) {
  const tErrors = useTranslations("errors");
  const [state, setState] = useState({ username, liked: initiallyLiked, count: initialCount });
  const [pending, setPending] = useState(false);
  const current = state.username === username ? state : { username, liked: initiallyLiked, count: initialCount };
  if (current !== state) setState(current);

  const toggle = async () => {
    const next = !current.liked;
    const shift = next ? 1 : -1;
    setState((was) => ({ ...was, liked: next, count: was.count + shift }));
    setPending(true);
    try {
      await (next ? profilesService.like(username) : profilesService.unlike(username));
    } catch (error) {
      setState((was) => ({ ...was, liked: !next, count: was.count - shift }));
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
    }
  };
  return { liked: current.liked, count: current.count, pending, toggle };
}

interface LikeButtonProps {
  like: ReturnType<typeof useProfileLike>;
  /** One's own profile: the count alone, nothing to like. */
  self: boolean;
}

/** Heart liking a profile, once per user, with its count; who likes it is never told. */
export function LikeButton({ like: { liked, count, pending, toggle }, self }: LikeButtonProps) {
  const t = useTranslations("profile.likes");
  const format = useFormatter();

  const content = (
    <>
      <HeartIcon className={cn(liked && "fill-rose-500! stroke-rose-500! text-rose-500!")} aria-hidden />
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
              className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border bg-background px-2.5 text-[0.8rem] font-medium [&_svg]:size-3.5"
            />
          ) : (
            <Button
              variant="outline"
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
      <TooltipContent>{t("anonymous")}</TooltipContent>
    </Tooltip>
  );
}

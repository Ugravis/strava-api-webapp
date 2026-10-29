"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { BadgeIcon } from "@/components/distances/badge-icon";
import type { UserTag } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ShowcaseDialog } from "./showcase-dialog";

/** Badges of the membership, in the order of the catalog, each opening its details. */
export function UserTags({ userTags, className }: { userTags: UserTag[]; className?: string }) {
  const t = useTranslations("profile.userTags");
  const format = useFormatter();
  const [open, setOpen] = useState<UserTag | null>(null);

  if (userTags.length === 0) return <div className={className} />;
  return (
    <>
      <ul className={cn("flex gap-1.5 overflow-hidden", className)} aria-label={t("label")}>
        {userTags.map((userTag) => (
          <li key={userTag.id}>
            <button
              type="button"
              onClick={() => setOpen(userTag)}
              aria-haspopup="dialog"
              className="flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2 text-[11px] whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Emblem userTag={userTag} className="size-3.5" />
              {userTag.name}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <ShowcaseDialog
          open
          onOpenChange={(next) => !next && setOpen(null)}
          media={
            <span className="grid size-20 place-items-center rounded-full bg-muted">
              <Emblem userTag={open} className="size-9" />
            </span>
          }
          title={open.name}
          subtitle={t("awarded", { date: format.dateTime(new Date(open.awardedAt), { dateStyle: "long" }) })}
          description={open.description ?? undefined}
        />
      )}
    </>
  );
}

function Emblem({ userTag, className }: { userTag: UserTag; className?: string }) {
  return (
    <BadgeIcon
      icon={userTag.icon}
      className={cn("shrink-0", className)}
      style={userTag.color ? { color: userTag.color } : undefined}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}

"use client";

import { CalendarIcon, PencilIcon } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/components/user/user-provider";
import { routes } from "@/config/routes";
import { publicNameOf } from "@/lib/user";

export function ProfileHeader() {
  const t = useTranslations("profile");
  const format = useFormatter();
  const user = useCurrentUser();
  const memberSince = format.dateTime(new Date(user.createdAt), { month: "long", year: "numeric" });

  return (
    <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
      <UserAvatar user={user} className="size-24 sm:size-20" fallbackClassName="text-2xl" />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{publicNameOf(user)}</h1>
        {user.displayName ? (
          <p className="truncate text-muted-foreground">@{user.username}</p>
        ) : (
          <Link
            href={routes.settings}
            className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:justify-start"
          >
            <PencilIcon className="size-3.5" aria-hidden />
            {t("addDisplayName")}
          </Link>
        )}
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
          <CalendarIcon className="size-4" aria-hidden />
          {t("memberSince", { date: memberSince })}
        </p>
      </div>
    </section>
  );
}

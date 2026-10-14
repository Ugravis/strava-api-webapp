"use client";

import { CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/components/user/user-provider";

export function ProfileHeader() {
  const t = useTranslations("profile");
  const format = useFormatter();
  const user = useCurrentUser();
  const memberSince = format.dateTime(new Date(user.createdAt), { month: "long", year: "numeric" });

  return (
    <section className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
      <UserAvatar user={user} className="size-24 sm:size-20" fallbackClassName="text-2xl" />
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{user.displayName}</h1>
        <p className="truncate text-muted-foreground">@{user.username}</p>
        <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground sm:justify-start">
          <CalendarIcon className="size-4" aria-hidden />
          {t("memberSince", { date: memberSince })}
        </p>
      </div>
    </section>
  );
}

"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userFollowsHref, userProfileHref } from "@/config/routes";
import { useFollowsList } from "@/hooks/use-follows-list";
import type { FollowDirection } from "@/lib/api/types";
import { UserRow, UserRowsSkeleton } from "./user-row";

const DIRECTIONS: FollowDirection[] = ["followers", "following"];

/** Followers of a user, or the users they follow, with tabs to switch between both. */
export function FollowsList({ username, direction }: { username: string; direction: FollowDirection }) {
  const t = useTranslations("community.lists");
  const router = useRouter();
  const { users, hasMore, loadingMore, error, loadMore } = useFollowsList(username, direction);
  const name = `@${username}`;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={userProfileHref(username)}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
      <Tabs
        value={direction}
        onValueChange={(next) => router.replace(userFollowsHref(username, next as FollowDirection), { scroll: false })}
      >
        <TabsList aria-label={t("label")} className="w-full group-data-horizontal/tabs:h-10">
          {DIRECTIONS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(tab)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {error ? (
        <p className="text-sm text-destructive">{t("error")}</p>
      ) : !users ? (
        <UserRowsSkeleton />
      ) : users.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t(direction === "followers" ? "emptyFollowers" : "emptyFollowing", { name })}
        </p>
      ) : (
        <>
          <ul className="divide-y">
            {users.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </ul>
          {hasMore && (
            <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="self-center">
              {t("loadMore")}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

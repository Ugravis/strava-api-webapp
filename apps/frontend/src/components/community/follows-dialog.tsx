"use client";

import { SearchIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@kilotrace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowsList } from "@/hooks/use-follows-list";
import { PROFILE_SEARCH_MIN_LENGTH, useProfileSearch } from "@/hooks/use-profile-search";
import type { FollowDirection, ProfileSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { UserRow, UserRowsSkeleton } from "./user-row";

const DIRECTIONS: FollowDirection[] = ["followers", "following"];

interface FollowsDialogProps {
  username: string;
  counts: Record<FollowDirection, number>;
  /** Tab shown, kept while the dialog closes. */
  direction: FollowDirection;
  open: boolean;
  onDirectionChange: (direction: FollowDirection) => void;
  onOpenChange: (open: boolean) => void;
}

/**
 * Followers of a user and the users they follow, in tabs, with a search of
 * every user above them: while searching, the results replace the tab.
 */
export function FollowsDialog({ username, counts, direction, open, onDirectionChange, onOpenChange }: FollowsDialogProps) {
  const t = useTranslations("community");
  const format = useFormatter();
  const [query, setQuery] = useState("");
  const searching = query.trim().length >= PROFILE_SEARCH_MIN_LENGTH;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      {/* A fixed height: centred, the dialog would jump as its skeleton gives way to the list. */}
      <DialogContent className="flex h-[min(40rem,calc(100dvh-2rem))] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">@{username}</DialogTitle>
        </DialogHeader>
        <Tabs value={direction} onValueChange={(next) => onDirectionChange(next as FollowDirection)}>
          <TabsList aria-label={t("lists.label")} className="w-full">
            {DIRECTIONS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`lists.${tab}`)}
                <span className="text-muted-foreground tabular-nums">{format.number(counts[tab])}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="h-9 shrink-0">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.label")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </InputGroup>
        <div
          className="-mx-4 min-h-40 flex-1 overflow-y-auto px-4"
          aria-live="polite"
          // Following a link to a profile closes the dialog.
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) onOpenChange(false);
          }}
        >
          {searching ? (
            <SearchResults query={query} />
          ) : (
            <FollowsTab key={direction} username={username} direction={direction} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowsTab({ username, direction }: { username: string; direction: FollowDirection }) {
  const t = useTranslations("community.lists");
  const { users, hasMore, loadingMore, error, loadMore } = useFollowsList(username, direction);
  const name = `@${username}`;

  if (error) return <p className="py-6 text-center text-sm text-destructive">{t("error")}</p>;
  if (!users) return <UserRowsSkeleton />;
  if (users.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t(direction === "followers" ? "emptyFollowers" : "emptyFollowing", { name })}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 pb-1">
      <UserList users={users} />
      {hasMore && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="self-center">
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}

/** Every user matching the query, those the current user follows first, apart. */
export function SearchResults({ query }: { query: string }) {
  const t = useTranslations("community.search");
  const tLists = useTranslations("community.lists");
  const { results, loading, error, hasMore, loadingMore, loadMore } = useProfileSearch(query);

  if (loading && !results) return <UserRowsSkeleton count={3} />;
  if (error) return <p className="py-6 text-center text-sm text-destructive">{t("error")}</p>;
  if (!results || results.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  // The followed users come first in every page: the groups stay apart as pages load.
  const followed = results.filter((user) => user.followed);
  const others = results.filter((user) => !user.followed);
  return (
    <div className={cn("flex flex-col gap-3 pb-1 transition-opacity", loading && "opacity-60")}>
      {followed.length > 0 && <ResultSection title={t("followed")} users={followed} />}
      {others.length > 0 && <ResultSection title={t("others")} users={others} />}
      {hasMore && (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="self-center">
          {tLists("loadMore")}
        </Button>
      )}
    </div>
  );
}

export function ResultSection({ title, users }: { title: string; users: ProfileSummary[] }) {
  return (
    <section>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <UserList users={users} />
    </section>
  );
}

function UserList({ users }: { users: ProfileSummary[] }) {
  return (
    <ul className="divide-y">
      {users.map((user) => (
        <UserRow key={user.id} user={user} />
      ))}
    </ul>
  );
}

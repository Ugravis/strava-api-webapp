"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ResultSection, SearchResults } from "@/components/community/follows-dialog";
import { UserRowsSkeleton } from "@/components/community/user-row";
import { Button } from "@kilotrace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useCurrentUser } from "@/components/user/user-provider";
import { type FollowsListState, useFollowsList } from "@/hooks/use-follows-list";
import { PROFILE_SEARCH_MIN_LENGTH } from "@/hooks/use-profile-search";
import type { ProfileSummary } from "@/lib/api/types";

/** A magnifier opening a search of every user, those followed first, apart; until typed, the follows of the current user. */
export function ProfileSearchDialog() {
  const t = useTranslations("profile.search");
  const tCommunity = useTranslations("community.search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("open")} title={t("open")} />}>
        <SearchIcon />
      </DialogTrigger>
      {/* A fixed height: centred, the dialog would jump as its skeleton gives way to the list. */}
      <DialogContent className="flex h-[min(40rem,calc(100dvh-2rem))] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <InputGroup className="h-9 shrink-0">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tCommunity("placeholder")}
            aria-label={tCommunity("label")}
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
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {query.trim().length >= PROFILE_SEARCH_MIN_LENGTH ? <SearchResults query={query} /> : <Suggestions />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Users the current one follows, then their followers not listed already, a page at a time. */
function Suggestions() {
  const t = useTranslations("profile.search");
  const user = useCurrentUser();
  const following = useFollowsList(user.username, "following");
  const followers = useFollowsList(user.username, "followers");

  if (following.error && followers.error) {
    return <p className="py-6 text-center text-sm text-destructive">{t("error")}</p>;
  }
  // A list that failed is left out.
  const followingUsers = following.error ? [] : following.users;
  const followerUsers = followers.error ? [] : followers.users;
  if (!followingUsers || !followerUsers) return <UserRowsSkeleton count={3} />;
  const listed = new Set(followingUsers.map(({ id }) => id));
  const otherFollowers = followerUsers.filter(({ id }) => !listed.has(id));
  if (followingUsers.length === 0 && otherFollowers.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("noSuggestions")}</p>;
  }
  return (
    <div className="flex flex-col gap-3 pb-1">
      <SuggestionSection title={t("following")} list={following} users={followingUsers} />
      <SuggestionSection title={t("followers")} list={followers} users={otherFollowers} />
    </div>
  );
}

function SuggestionSection({ title, list, users }: { title: string; list: FollowsListState; users: ProfileSummary[] }) {
  const tLists = useTranslations("community.lists");
  if (users.length === 0 && !list.hasMore) return null;
  return (
    <>
      <ResultSection title={title} users={users} />
      {list.hasMore && (
        <Button variant="outline" size="sm" onClick={list.loadMore} disabled={list.loadingMore} className="self-center">
          {tLists("loadMore")}
        </Button>
      )}
    </>
  );
}

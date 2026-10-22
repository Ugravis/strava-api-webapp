"use client";

import { useCallback, useEffect, useState } from "react";
import type { FollowDirection, ProfileSummary } from "@/lib/api/types";
import { FOLLOWS_PAGE_SIZE, profilesService } from "@/services/profiles.service";

export interface FollowsListState {
  /** Null until the first page. */
  users: ProfileSummary[] | null;
  hasMore: boolean;
  loadingMore: boolean;
  error: boolean;
  loadMore: () => void;
}

/** Followers of a user, or the users they follow, the latest first, a page at a time. */
export function useFollowsList(username: string, direction: FollowDirection): FollowsListState {
  const [users, setUsers] = useState<ProfileSummary[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profilesService.list(username, direction, 0).then(
      (page) => {
        if (cancelled) return;
        setUsers(page);
        setHasMore(page.length === FOLLOWS_PAGE_SIZE);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [username, direction]);

  const loadMore = useCallback(() => {
    if (!users) return;
    setLoadingMore(true);
    profilesService
      .list(username, direction, users.length)
      .then(
        (page) => {
          // A user followed meanwhile shifts the pages: not listed twice.
          setUsers((current) => {
            const known = new Set(current?.map(({ id }) => id));
            return [...(current ?? []), ...page.filter(({ id }) => !known.has(id))];
          });
          setHasMore(page.length === FOLLOWS_PAGE_SIZE);
        },
        () => setError(true),
      )
      .finally(() => setLoadingMore(false));
  }, [username, direction, users]);

  return { users, hasMore, loadingMore, error, loadMore };
}

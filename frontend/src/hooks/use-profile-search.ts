"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfileSummary } from "@/lib/api/types";
import { profilesService, SEARCH_PAGE_SIZE } from "@/services/profiles.service";
import { useDebouncedValue } from "./use-debounced-value";

/** Shortest query sent to the server. */
export const PROFILE_SEARCH_MIN_LENGTH = 2;

export interface ProfileSearchState {
  /** Null while no query is long enough or the search is under way. */
  results: ProfileSummary[] | null;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  /** Loads the next page of results, if any. */
  loadMore: () => void;
}

interface SearchPage {
  query: string;
  results: ProfileSummary[] | null;
  error: boolean;
  hasMore: boolean;
}

/** Users matching the query, searched once typing pauses, a page at a time. */
export function useProfileSearch(query: string): ProfileSearchState {
  const debounced = useDebouncedValue(query.trim(), 250);
  const [state, setState] = useState<SearchPage>({ query: "", results: null, error: false, hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const searchable = debounced.length >= PROFILE_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    profilesService.search(debounced).then(
      (results) => {
        if (!cancelled) setState({ query: debounced, results, error: false, hasMore: results.length === SEARCH_PAGE_SIZE });
      },
      () => {
        if (!cancelled) setState({ query: debounced, results: null, error: true, hasMore: false });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, searchable]);

  const loadMore = useCallback(() => {
    const { query: searched, results } = state;
    if (!results || loadingMore) return;
    setLoadingMore(true);
    profilesService
      .search(searched, results.length)
      .then(
        (page) =>
          // Kept for the query searched only; a user listed twice as the results shift is skipped.
          setState((current) => {
            if (current.query !== searched || !current.results) return current;
            const known = new Set(current.results.map(({ id }) => id));
            return {
              ...current,
              results: [...current.results, ...page.filter(({ id }) => !known.has(id))],
              hasMore: page.length === SEARCH_PAGE_SIZE,
            };
          }),
        () => setState((current) => ({ ...current, hasMore: false })),
      )
      .finally(() => setLoadingMore(false));
  }, [state, loadingMore]);

  if (!searchable) {
    return { results: null, loading: false, error: false, hasMore: false, loadingMore: false, loadMore };
  }
  // Results of an older query are not shown.
  const settled = state.query === debounced && query.trim() === debounced;
  return {
    results: settled ? state.results : null,
    loading: !settled,
    error: settled && state.error,
    hasMore: settled && state.hasMore,
    loadingMore,
    loadMore,
  };
}

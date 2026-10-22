"use client";

import { useEffect, useState } from "react";
import type { ProfileSummary } from "@/lib/api/types";
import { profilesService } from "@/services/profiles.service";
import { useDebouncedValue } from "./use-debounced-value";

/** Shortest query sent to the server. */
export const PROFILE_SEARCH_MIN_LENGTH = 2;

export interface ProfileSearchState {
  /** Null while no query is long enough or the search is under way. */
  results: ProfileSummary[] | null;
  loading: boolean;
  error: boolean;
}

/** Users matching the query, searched once typing pauses. */
export function useProfileSearch(query: string): ProfileSearchState {
  const debounced = useDebouncedValue(query.trim(), 250);
  const [state, setState] = useState<{ query: string; results: ProfileSummary[] | null; error: boolean }>({
    query: "",
    results: null,
    error: false,
  });
  const searchable = debounced.length >= PROFILE_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!searchable) return;
    let cancelled = false;
    profilesService.search(debounced).then(
      (results) => {
        if (!cancelled) setState({ query: debounced, results, error: false });
      },
      () => {
        if (!cancelled) setState({ query: debounced, results: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [debounced, searchable]);

  if (!searchable) {
    return { results: null, loading: false, error: false };
  }
  // Results of an older query are not shown.
  const settled = state.query === debounced && query.trim() === debounced;
  return {
    results: settled ? state.results : null,
    loading: !settled,
    error: settled && state.error,
  };
}

"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNotifications } from "@/components/notifications/notifications-provider";
import type { FollowsSummary } from "@/lib/api/types";
import { profilesService } from "@/services/profiles.service";

interface FollowsSummaryState {
  /** Null until the first response. */
  summary: FollowsSummary | null;
  /** Fetches it again, e.g. once a user is followed or a request answered. */
  refresh: () => void;
}

const FollowsSummaryContext = createContext<FollowsSummaryState | null>(null);

/**
 * Who the current user follows and who asks to follow them, in counts, for
 * the navigation and the profile page. Fetched again on every notification
 * event: a request coming in, withdrawn, or seen in the panel.
 */
export function FollowsSummaryProvider({ children }: { children: ReactNode }) {
  const { revision, unreadCount } = useNotifications();
  const [summary, setSummary] = useState<FollowsSummary | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    profilesService.summary().then(
      (next) => !cancelled && setSummary(next),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [revision, unreadCount, attempt]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);
  const state = useMemo(() => ({ summary, refresh }), [summary, refresh]);

  return <FollowsSummaryContext value={state}>{children}</FollowsSummaryContext>;
}

/** The follows summary; inert outside of the provider. */
export function useFollowsSummary(): FollowsSummaryState {
  return use(FollowsSummaryContext) ?? NO_SUMMARY;
}

const NO_SUMMARY: FollowsSummaryState = { summary: null, refresh: () => {} };

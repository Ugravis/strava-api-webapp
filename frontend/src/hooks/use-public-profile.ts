"use client";

import { useCallback, useEffect, useState } from "react";
import { errorCodeOf, type ApiErrorCode } from "@/lib/api/errors";
import type { PublicProfile } from "@/lib/api/types";
import { profilesService } from "@/services/profiles.service";

export interface PublicProfileState {
  /** Null until the first response. */
  profile: PublicProfile | null;
  error: ApiErrorCode | null;
  retry: () => void;
  /** Shows the profile followed or not by the current user, its count of followers along. */
  showFollowed: (followed: boolean) => void;
}

/** The public profile of a user, with who follows whom. */
export function usePublicProfile(username: string): PublicProfileState {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<ApiErrorCode | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    profilesService.get(username).then(
      (next) => {
        if (cancelled) return;
        setProfile(next);
        setError(null);
      },
      (failure: unknown) => {
        if (!cancelled) setError(errorCodeOf(failure));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [username, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  const showFollowed = useCallback((followed: boolean) => {
    setProfile((current) =>
      current && current.followed !== followed
        ? { ...current, followed, followersCount: current.followersCount + (followed ? 1 : -1) }
        : current,
    );
  }, []);

  return { profile, error, retry, showFollowed };
}

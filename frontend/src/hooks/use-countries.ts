"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { CountriesCompletion } from "@/lib/api/types";
import { countriesService } from "@/services/countries.service";

/** The backend locates the new tiles and computes the totals in the background. */
const PENDING_POLL_MS = 10_000;

const fetchCompletion = sharedRequest(() => countriesService.getCompletion());

function isPending(completion: CountriesCompletion): boolean {
  return (
    completion.pendingTiles > 0 ||
    completion.countries.some((country) => country.tiles.total === null || country.subtiles.total === null)
  );
}

/**
 * Completion of the countries visited by the current user, fetched again
 * whenever `version` changes and polled while it is being computed.
 */
export function useCountries(version: string): { completion: CountriesCompletion | null; error: boolean } {
  const [completion, setCompletion] = useState<CountriesCompletion | null>(null);
  const [error, setError] = useState(false);
  const [poll, setPoll] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchCompletion(`${version}/${poll}`).then(
      (next) => {
        if (cancelled) return;
        setCompletion(next);
        setError(false);
        if (isPending(next)) timer = setTimeout(() => setPoll((count) => count + 1), PENDING_POLL_MS);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [version, poll]);

  return { completion, error };
}

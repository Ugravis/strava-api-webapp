"use client";

import { useEffect, useState } from "react";
import { useTrackSync } from "@/components/tracks/track-sync-provider";
import type { CountryOutlines } from "@/lib/api/types";
import { countriesService } from "@/services/countries.service";

/**
 * Outlines of the countries visited by the current user. Fetched again when
 * new tracks arrive, that is once a synchronization brought new activities.
 */
export function useCountryOutlines(): CountryOutlines | null {
  const { version } = useTrackSync();
  const [outlines, setOutlines] = useState<CountryOutlines | null>(null);

  useEffect(() => {
    let cancelled = false;
    countriesService.getOutlines().then(
      (next) => {
        if (!cancelled) setOutlines(next);
      },
      // Decorative: the map stays usable without them.
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [version]);

  return outlines;
}

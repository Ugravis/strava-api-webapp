"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { CountrySector } from "@/lib/api/types";
import { countriesService } from "@/services/countries.service";

/** The backend computes the shape of a country not visited yet in the background. */
const PENDING_POLL_MS = 10_000;

const fetchSector = sharedRequest(countriesService.getSector);

/** A sector and the query it answers. */
interface Answer {
  key: string;
  sector: CountrySector;
}

/**
 * A country as a sector of the map, fetched again when the tiles change
 * (`tilesVersion`), and polled while its shape is being computed. Nothing
 * without a country (`code` null). A sector of another country is never
 * shown in its place.
 */
export function useCountrySector(
  code: string | null,
  tilesVersion: string | null,
): { sector: CountrySector | null; error: boolean } {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [poll, setPoll] = useState(0);
  const key = code ? `${code}/${tilesVersion}` : null;

  useEffect(() => {
    if (!code || !key) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchSector(`${key}/${poll}`, code).then(
      (sector) => {
        if (cancelled) return;
        setAnswer({ key, sector });
        setFailed(null);
        if (sector.shapeVersion === null) timer = setTimeout(() => setPoll((count) => count + 1), PENDING_POLL_MS);
      },
      () => {
        if (!cancelled) setFailed(key);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, key, poll]);

  if (!code) return { sector: null, error: false };
  // The previous answer stays while the tiles change, not when the country does.
  const sector = answer && answer.sector.code === code ? answer.sector : null;
  return { sector, error: failed === key && !sector };
}

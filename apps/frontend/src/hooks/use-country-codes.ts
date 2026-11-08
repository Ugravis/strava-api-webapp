"use client";

import { useEffect, useState } from "react";
import { countriesService } from "@/services/countries.service";

/** The countries change only with a new import of the boundaries: fetched once per page load. */
let codesRequest: Promise<string[]> | null = null;

function fetchCodes(): Promise<string[]> {
  codesRequest ??= countriesService.getCodes().catch((error: unknown) => {
    // A failure is tried again by the next caller.
    codesRequest = null;
    throw error;
  });
  return codesRequest;
}

/** Codes of every country, fetched once `enabled`; null while loading. */
export function useCountryCodes(enabled: boolean): { codes: string[] | null; error: boolean } {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchCodes().then(
      (next) => {
        if (cancelled) return;
        setCodes(next);
        setError(false);
      },
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { codes, error };
}

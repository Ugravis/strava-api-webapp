"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import { countriesService } from "@/services/countries.service";

/** Decimals of the point looked up, about 10 m: a camera barely moved keeps its answer. */
const POINT_DECIMALS = 4;

const fetchCountryAt = sharedRequest(countriesService.getCountryAt);

/** The country found under a point, and the point rounded. */
export interface CountryAt {
  key: string;
  /** Null at sea. */
  code: string | null;
}

/**
 * The country under a point of the map, in degrees; nothing without a point
 * (`point` null). Undefined until the country of the latest point is known,
 * so that a caller tells a sea from a pending answer.
 */
export function useCountryAt(point: [number, number] | null): CountryAt | undefined {
  const [answer, setAnswer] = useState<CountryAt | null>(null);
  const lon = point ? point[0].toFixed(POINT_DECIMALS) : null;
  const lat = point ? point[1].toFixed(POINT_DECIMALS) : null;
  const key = lon !== null && lat !== null ? `${lon},${lat}` : null;

  useEffect(() => {
    if (key === null || lon === null || lat === null) return;
    let cancelled = false;
    fetchCountryAt(key, Number(lon), Number(lat)).then(
      ({ code }) => {
        if (!cancelled) setAnswer({ key, code });
      },
      // A failure keeps the sector shown, as the sea does.
      () => {
        if (!cancelled) setAnswer({ key, code: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, lon, lat]);

  return answer && answer.key === key ? answer : undefined;
}

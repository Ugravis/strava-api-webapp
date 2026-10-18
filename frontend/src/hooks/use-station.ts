"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { StationDetails } from "@/lib/api/types";
import { stationsService } from "@/services/stations.service";

const fetchDetails = sharedRequest(stationsService.getDetails);

/** One station, its first visit by the user and its neighbors on the railway. */
export function useStation(id: number): { station: StationDetails | null; error: boolean } {
  const [state, setState] = useState<{ id: number; station: StationDetails | null; error: boolean }>({
    id: 0,
    station: null,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchDetails(String(id), id).then(
      (station) => {
        if (!cancelled) setState({ id, station, error: false });
      },
      () => {
        if (!cancelled) setState({ id, station: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id]);

  // A previous station's answer is never shown for another one.
  return state.id === id ? state : { station: null, error: false };
}

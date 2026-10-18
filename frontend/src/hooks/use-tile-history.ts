"use client";

import { useEffect, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { HistoryMode, TileHistorySummary } from "@/lib/api/types";
import { tilesService } from "@/services/tiles.service";

/** The backend replays the first visits in the background, a few seconds after the tiles change. */
const PENDING_POLL_MS = 3_000;

const fetchHistory = sharedRequest(tilesService.getHistory);

/** A summary and the query it answers. */
interface Answer {
  key: string;
  summary: TileHistorySummary;
}

/**
 * Counts of the history of the tiles at `instant`, fetched again when the
 * tiles change (`tilesVersion`), and polled while their first visits are
 * being replayed. Nothing while the tool is closed (`mode` null). The
 * previous summary stays until the next one arrives: `loading` tells it apart.
 */
export function useTileHistory(
  mode: HistoryMode | null,
  instant: string,
  tilesVersion: string | null,
): { summary: TileHistorySummary | null; loading: boolean; error: boolean } {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [poll, setPoll] = useState(0);
  const key = mode ? `${mode}/${instant}/${tilesVersion}` : null;

  useEffect(() => {
    if (!mode || !key) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchHistory(`${key}/${poll}`, mode, instant).then(
      (summary) => {
        if (cancelled) return;
        setAnswer({ key, summary });
        setFailed(null);
        if (!summary.upToDate) timer = setTimeout(() => setPoll((count) => count + 1), PENDING_POLL_MS);
      },
      () => {
        if (!cancelled) setFailed(key);
      },
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mode, instant, key, poll]);

  if (!key) return { summary: null, loading: false, error: false };
  return { summary: answer?.summary ?? null, loading: answer?.key !== key, error: failed === key };
}

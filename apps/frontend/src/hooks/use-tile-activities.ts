"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sharedRequest } from "@/lib/api/shared-request";
import type { TileActivity } from "@/lib/api/types";
import type { TileZoom } from "@/lib/tiles/tile-geometry";
import { tilesService } from "@/services/tiles.service";

/** Activities loaded at once: the first page, then each "load more". */
const PAGE_SIZE = 5;

interface TileActivitiesState {
  /** Null until the first page is loaded. */
  items: TileActivity[] | null;
  /** Cursor of the next page; null once every activity is loaded. */
  next: string | null;
  loading: boolean;
  error: boolean;
}

const fetchPage = sharedRequest(tilesService.getActivities);

const INITIAL: TileActivitiesState = { items: null, next: null, loading: true, error: false };

/** Activities that crossed one tile, the latest ones first, loaded page by page. */
export function useTileActivities(
  zoom: TileZoom,
  x: number,
  y: number,
): TileActivitiesState & { hasMore: boolean; loadMore: () => void } {
  const [state, setState] = useState<TileActivitiesState>(INITIAL);
  // A page answered after unmounting is dropped.
  const activeRef = useRef(true);

  /** Loads the page after `cursor`, the first one when null, `loading` already set. */
  const load = useCallback(
    (cursor: string | null) =>
      fetchPage(`${zoom}/${x}/${y}/${cursor}`, zoom, x, y, PAGE_SIZE, cursor).then(
        (page) => {
          if (!activeRef.current) return;
          setState((current) => ({
            items: [...(cursor ? (current.items ?? []) : []), ...page.items],
            next: page.next,
            loading: false,
            error: false,
          }));
        },
        () => {
          if (activeRef.current) setState((current) => ({ ...current, loading: false, error: true }));
        },
      ),
    [zoom, x, y],
  );

  useEffect(() => {
    // The tile is known on mount: the component is keyed by it.
    activeRef.current = true;
    void load(null);
    return () => {
      activeRef.current = false;
    };
  }, [load]);

  const { items, next, loading } = state;
  const loadMore = useCallback(() => {
    if (loading) return;
    setState((current) => ({ ...current, loading: true, error: false }));
    // After a failed first page, "retry" loads it again.
    void load(items === null ? null : next);
  }, [items, next, loading, load]);

  return { ...state, hasMore: next !== null, loadMore };
}

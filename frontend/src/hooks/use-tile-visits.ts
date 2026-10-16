"use client";

import { useEffect, useState } from "react";
import type { TileVisits } from "@/lib/api/types";
import type { TileZoom } from "@/lib/tiles/tile-geometry";
import { tilesService } from "@/services/tiles.service";

/** Activities that crossed one tile. */
export function useTileVisits(zoom: TileZoom, x: number, y: number): { visits: TileVisits | null; error: boolean } {
  const [state, setState] = useState<{ key: string; visits: TileVisits | null; error: boolean }>({
    key: "",
    visits: null,
    error: false,
  });
  const key = `${zoom}/${x}/${y}`;

  useEffect(() => {
    let cancelled = false;
    tilesService.getVisits(zoom, x, y).then(
      (visits) => {
        if (!cancelled) setState({ key, visits, error: false });
      },
      () => {
        if (!cancelled) setState({ key, visits: null, error: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, zoom, x, y]);

  // A previous tile's answer is never shown for another one.
  return state.key === key ? state : { visits: null, error: false };
}

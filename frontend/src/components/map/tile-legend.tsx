"use client";

import { useTranslations } from "next-intl";
import type { ExploredTiles } from "@/lib/tiles/tile-geometry";
import { CLUSTER_COLOR, SQUARE_COLOR } from "./map-style";
import type { TileMode } from "./tile-layers";

const LEVELS: Record<TileMode, ("tiles" | "subtiles")[]> = {
  none: [],
  tiles: ["tiles"],
  subtiles: ["subtiles"],
  both: ["tiles", "subtiles"],
};

/** Key of the shapes drawn over the tiles, with their sizes. */
export function TileLegend({ explored, mode }: { explored: ExploredTiles | null; mode: TileMode }) {
  const t = useTranslations("map.legend");
  const levels = LEVELS[mode];
  if (!explored || levels.length === 0) return null;
  const combined = levels.length > 1;

  return (
    <ul className="flex flex-col gap-1 rounded-xl border bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      {levels.map((level) => {
        const { maxSquare, maxCluster } = explored[level];
        const prefix = combined ? `${t(level)} · ` : "";
        return [
          <li key={`${level}-square`} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-[2px] border-2"
              style={{ borderColor: SQUARE_COLOR, borderStyle: level === "subtiles" ? "dashed" : "solid" }}
              aria-hidden
            />
            {prefix}
            {t("maxSquare", { size: maxSquare?.size ?? 0 })}
          </li>,
          <li key={`${level}-cluster`} className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-[2px]"
              style={{ backgroundColor: CLUSTER_COLOR, opacity: level === "subtiles" ? 0.6 : 0.45 }}
              aria-hidden
            />
            {prefix}
            {t("maxCluster", { count: maxCluster.length })}
          </li>,
        ];
      })}
    </ul>
  );
}

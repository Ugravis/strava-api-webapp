"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import type { TileMode } from "./tile-layers";

/** Optional layers of the map, over the large tiles which are always drawn. */
export interface MapLayers {
  tracks: boolean;
  subtiles: boolean;
}

export const ALL_MAP_LAYERS: MapLayers = { tracks: true, subtiles: true };

const OPTIONS: (keyof MapLayers)[] = ["tracks", "subtiles"];

/** Levels of tiles drawn for the layers chosen. */
export function tileModeOf({ subtiles }: MapLayers): TileMode {
  return subtiles ? "both" : "tiles";
}

/** Checkboxes choosing the optional layers drawn on the map. */
export function MapLayersToggle({ layers, onChange }: { layers: MapLayers; onChange: (layers: MapLayers) => void }) {
  const t = useTranslations("map.layers");

  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur">
      <legend className="sr-only">{t("label")}</legend>
      {OPTIONS.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-1.5">
          <Checkbox
            checked={layers[option]}
            onCheckedChange={(checked) => onChange({ ...layers, [option]: checked })}
          />
          {t(option)}
        </label>
      ))}
    </fieldset>
  );
}

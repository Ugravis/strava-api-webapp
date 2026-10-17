import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { CountryOutlines } from "@/lib/api/types";
import { COUNTRY_COLOR } from "./map-style";

const SOURCE_ID = "visited-countries";

export const EMPTY_COUNTRIES: CountryOutlines = { type: "FeatureCollection", features: [] };

/** Adds a light fill on the visited countries below `beforeId`, under the tiles and the tracks. */
export function addCountryLayer(map: MapLibreMap, data: CountryOutlines, beforeId: string | undefined): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  map.addLayer(
    {
      id: "visited-countries-fill",
      type: "fill",
      source: SOURCE_ID,
      paint: { "fill-color": COUNTRY_COLOR, "fill-opacity": 0.08 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "visited-countries-outline",
      type: "line",
      source: SOURCE_ID,
      paint: { "line-color": COUNTRY_COLOR, "line-opacity": 0.35, "line-width": 1 },
    },
    beforeId,
  );
}

export function setCountryData(map: MapLibreMap, data: CountryOutlines): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
}

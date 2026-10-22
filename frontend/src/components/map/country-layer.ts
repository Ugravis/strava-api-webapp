import type { Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import { belowActivityTiles } from "./activity-tiles-layer";
import { fadeIn, type MapPalette } from "./map-style";
import { TILE_FILL_LAYER_ID } from "./tile-layers";

/** Countries visited by the user and the version of the shapes, from the completion. */
export interface VisitedCountries {
  codes: string[];
  /** Null while no shape is computed. */
  shapesVersion: string | null;
}

export const NO_COUNTRIES: VisitedCountries = { codes: [], shapesVersion: null };

const SOURCE_ID = "country-shapes";
/** Layers of the vector tiles served by the backend: the merged areas and their outer borders. */
const AREA_SOURCE_LAYER = "visited";
const BORDER_SOURCE_LAYER = "borders";
/** The backend serves the shapes down to this zoom; the map stretches them beyond. */
const SHAPES_MAX_ZOOM = 10;
const FILL_ID = "visited-countries-fill";
/** Zoom from which the borders of the visited area fade in. */
const BORDER_MIN_ZOOM = 7;
const LINE_ID = "visited-countries-line";

/** The countries are part of the URL, sorted: the browser caches each set of countries. */
function tilesUrl({ codes, shapesVersion }: VisitedCountries & { shapesVersion: string }): string {
  const countries = [...codes].sort().join(",");
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/countries/shapes/{z}/{x}/{y}?countries=${countries}&v=${shapesVersion}`;
}

/**
 * Adds the visited countries, merged by the backend into one area made of
 * the large tiles touching them, as the ground of the map: only the borders
 * with the countries not visited follow the tiles, and the water of the
 * base map, drawn over them, hides the parts of the border tiles at sea.
 */
function addCountryLayers(
  map: MapLibreMap,
  countries: VisitedCountries & { shapesVersion: string },
  palette: MapPalette,
): void {
  // Below the tiles when they are drawn first.
  const beforeId = map.getLayer(TILE_FILL_LAYER_ID) ? TILE_FILL_LAYER_ID : belowActivityTiles(map);
  map.addSource(SOURCE_ID, {
    type: "vector",
    tiles: [tilesUrl(countries)],
    maxzoom: SHAPES_MAX_ZOOM,
  });
  map.addLayer(
    {
      id: FILL_ID,
      type: "fill",
      source: SOURCE_ID,
      "source-layer": AREA_SOURCE_LAYER,
      paint: { "fill-color": palette.country, "fill-opacity": palette.countryOpacity },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: LINE_ID,
      type: "line",
      source: SOURCE_ID,
      "source-layer": BORDER_SOURCE_LAYER,
      // At the scale of a continent, the borders following the tiles along the
      // coasts would be a scribble: they appear once the tiles are visible.
      minzoom: BORDER_MIN_ZOOM,
      paint: {
        "line-color": palette.countryBorder,
        "line-opacity": fadeIn(BORDER_MIN_ZOOM, 0.35),
        "line-width": 0.8,
      },
    },
    beforeId,
  );
}

/** Shows the visited countries, adding the layers once there are shapes. */
export function setVisitedCountries(map: MapLibreMap, countries: VisitedCountries, palette: MapPalette): void {
  const { shapesVersion } = countries;
  if (!shapesVersion) return;
  const source = map.getSource<VectorTileSource>(SOURCE_ID);
  if (!source) {
    addCountryLayers(map, { ...countries, shapesVersion }, palette);
    return;
  }
  const url = tilesUrl({ ...countries, shapesVersion });
  if (source.tiles[0] !== url) source.setTiles([url]);
}

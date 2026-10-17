import type { LayerSpecification, Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import { COUNTRY_COLOR } from "./map-style";

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
const LINE_ID = "visited-countries-line";
const WATER_MASK_PREFIX = "visited-countries-water-";
/** The shapes go below these layers of the base map: roads, buildings and borders stay readable. */
const ABOVE_SOURCE_LAYERS = new Set(["transportation", "building", "aeroway", "boundary"]);
/** Water of the base map, drawn again over the shapes. */
const WATER_SOURCE_LAYERS = new Set(["water", "waterway"]);

/** The countries are part of the URL, sorted: the browser caches each set of countries. */
function tilesUrl({ codes, shapesVersion }: VisitedCountries & { shapesVersion: string }): string {
  const countries = [...codes].sort().join(",");
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/countries/shapes/{z}/{x}/{y}?countries=${countries}&v=${shapesVersion}`;
}

function sourceLayerOf(layer: LayerSpecification): string | undefined {
  return "source-layer" in layer ? layer["source-layer"] : undefined;
}

/**
 * Adds the visited countries, merged by the backend into one area made of
 * the large tiles touching them, over the land of the base map: only the
 * borders with the countries not visited follow the tiles. Copies of its
 * water layers then hide the parts of the border tiles at sea, on lakes and
 * rivers: the water keeps the same color everywhere.
 */
function addCountryLayers(map: MapLibreMap, countries: VisitedCountries & { shapesVersion: string }): void {
  const layers = map.getStyle().layers;
  const beforeId =
    layers.find((layer) => ABOVE_SOURCE_LAYERS.has(sourceLayerOf(layer) ?? ""))?.id ??
    layers.find((layer) => layer.type === "symbol")?.id;
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
      paint: { "fill-color": COUNTRY_COLOR, "fill-opacity": 0.12 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: LINE_ID,
      type: "line",
      source: SOURCE_ID,
      "source-layer": BORDER_SOURCE_LAYER,
      paint: { "line-color": COUNTRY_COLOR, "line-opacity": 0.4, "line-width": 1 },
    },
    beforeId,
  );
  // Same source as the base map: no extra download.
  for (const layer of layers) {
    if (WATER_SOURCE_LAYERS.has(sourceLayerOf(layer) ?? "") && (layer.type === "fill" || layer.type === "line")) {
      map.addLayer({ ...layer, id: `${WATER_MASK_PREFIX}${layer.id}` }, beforeId);
    }
  }
}

/** Shows the visited countries, adding the layers once there are shapes. */
export function setVisitedCountries(map: MapLibreMap, countries: VisitedCountries): void {
  const { shapesVersion } = countries;
  if (!shapesVersion) return;
  const source = map.getSource<VectorTileSource>(SOURCE_ID);
  if (!source) {
    addCountryLayers(map, { ...countries, shapesVersion });
    return;
  }
  const url = tilesUrl({ ...countries, shapesVersion });
  if (source.tiles[0] !== url) source.setTiles([url]);
}

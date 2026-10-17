import type { FilterSpecification, LayerSpecification, Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import { COUNTRY_COLOR } from "./map-style";

/** Countries visited by the user and the version of the shapes, from the completion. */
export interface VisitedCountries {
  codes: string[];
  /** Null while no shape is computed. */
  shapesVersion: string | null;
}

export const NO_COUNTRIES: VisitedCountries = { codes: [], shapesVersion: null };

const SOURCE_ID = "country-shapes";
/** Layer of the shapes in the vector tiles served by the backend. */
const SOURCE_LAYER = "countries";
/** The backend serves the shapes down to this zoom; the map stretches them beyond. */
const SHAPES_MAX_ZOOM = 10;
const FILL_ID = "visited-countries-fill";
const LINE_ID = "visited-countries-line";
const WATER_MASK_PREFIX = "visited-countries-water-";
/** The shapes go below these layers of the base map: roads, buildings and borders stay readable. */
const ABOVE_SOURCE_LAYERS = new Set(["transportation", "building", "aeroway", "boundary"]);

function tilesUrl(version: string): string {
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/countries/shapes/{z}/{x}/{y}?v=${version}`;
}

function visitedFilter(codes: string[]): FilterSpecification {
  return ["in", ["get", "code"], ["literal", codes]];
}

function sourceLayerOf(layer: LayerSpecification): string | undefined {
  return "source-layer" in layer ? layer["source-layer"] : undefined;
}

/**
 * Adds the shapes of the visited countries, made of the large tiles touching
 * them, over the land of the base map. Copies of its water layers then hide
 * the parts of the border tiles at sea or on lakes: only the land borders
 * follow the tiles.
 */
function addCountryLayers(map: MapLibreMap, countries: VisitedCountries & { shapesVersion: string }): void {
  const layers = map.getStyle().layers;
  const beforeId =
    layers.find((layer) => ABOVE_SOURCE_LAYERS.has(sourceLayerOf(layer) ?? ""))?.id ??
    layers.find((layer) => layer.type === "symbol")?.id;
  map.addSource(SOURCE_ID, {
    type: "vector",
    tiles: [tilesUrl(countries.shapesVersion)],
    maxzoom: SHAPES_MAX_ZOOM,
  });
  const filter = visitedFilter(countries.codes);
  map.addLayer(
    {
      id: FILL_ID,
      type: "fill",
      source: SOURCE_ID,
      "source-layer": SOURCE_LAYER,
      filter,
      paint: { "fill-color": COUNTRY_COLOR, "fill-opacity": 0.12 },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: LINE_ID,
      type: "line",
      source: SOURCE_ID,
      "source-layer": SOURCE_LAYER,
      filter,
      paint: { "line-color": COUNTRY_COLOR, "line-opacity": 0.4, "line-width": 1 },
    },
    beforeId,
  );
  // Same source as the base map: no extra download.
  for (const layer of layers) {
    if (layer.type === "fill" && sourceLayerOf(layer) === "water") {
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
  const url = tilesUrl(shapesVersion);
  if (source.tiles[0] !== url) source.setTiles([url]);
  const filter = visitedFilter(countries.codes);
  map.setFilter(FILL_ID, filter);
  map.setFilter(LINE_ID, filter);
}

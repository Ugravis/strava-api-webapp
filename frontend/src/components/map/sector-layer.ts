import type { Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import type { MapPalette } from "./map-style";

/** What the sector tool draws on the map. */
export interface MapSector {
  /** ISO 3166-1 alpha-2 code of the country. */
  code: string;
  /** Version of its tile shape; null while it is being computed: nothing is dimmed yet. */
  shapeVersion: string | null;
  /** Main landmass, `[west, south, east, north]` in degrees, framed by the camera. */
  bounds: [number, number, number, number] | null;
}

const SOURCE_ID = "sector-outside";
/** Layers of the vector tiles served by the backend: the area outside the sector and its border. */
const OUTSIDE_SOURCE_LAYER = "outside";
const BORDER_SOURCE_LAYER = "border";
/** The backend serves the shapes down to this zoom; the map stretches them beyond. */
const SHAPES_MAX_ZOOM = 10;
/** The veil of the sector: the layers drawn over the map go below it. */
export const SECTOR_VEIL_LAYER_ID = "sector-outside-fill";
const FILL_ID = SECTOR_VEIL_LAYER_ID;
const LINE_ID = "sector-border-line";

/** The version is part of the URL: the browser caches each shape. */
function tilesUrl(code: string, shapeVersion: string): string {
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/countries/${code}/outside/{z}/{x}/{y}?v=${shapeVersion}`;
}

function removeSectorLayers(map: MapLibreMap): void {
  for (const id of [LINE_ID, FILL_ID]) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

/**
 * Dims everything outside the tile shape of the sector, base map, tiles,
 * tracks and labels alike, under a veil over every other layer, and
 * outlines the sector. Without a sector or its shape, nothing is dimmed.
 * Each shape gets its own source: a vector source whose first tiles were
 * empty would keep drawing nothing after `setTiles`.
 */
export function setSector(map: MapLibreMap, sector: MapSector | null, palette: MapPalette): void {
  const url = sector?.shapeVersion ? tilesUrl(sector.code, sector.shapeVersion) : null;
  const source = map.getSource<VectorTileSource>(SOURCE_ID);
  if (source && source.tiles[0] === url) return;
  removeSectorLayers(map);
  if (!url) return;
  map.addSource(SOURCE_ID, { type: "vector", tiles: [url], maxzoom: SHAPES_MAX_ZOOM });
  // Over every other layer: the layers added later all go below another one.
  map.addLayer({
    id: FILL_ID,
    type: "fill",
    source: SOURCE_ID,
    "source-layer": OUTSIDE_SOURCE_LAYER,
    paint: { "fill-color": palette.outside, "fill-opacity": palette.outsideOpacity, "fill-antialias": false },
  });
  map.addLayer({
    id: LINE_ID,
    type: "line",
    source: SOURCE_ID,
    "source-layer": BORDER_SOURCE_LAYER,
    layout: { "line-join": "round" },
    paint: {
      "line-color": palette.sectorBorder,
      "line-opacity": 0.5,
      "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 10, 1.5],
    },
  });
}

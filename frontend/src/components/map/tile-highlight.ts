import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { tileCollection, type TileZoom } from "@/lib/tiles/tile-geometry";
import type { MapPalette } from "./map-style";

const SOURCE_ID = "tile-highlight";
const LAYER_ID = "tile-highlight-line";

/** A tile of one of the two levels. */
export interface TileRef {
  zoom: TileZoom;
  x: number;
  y: number;
}

const EMPTY: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };

function highlightData(tile: TileRef | null): FeatureCollection<Polygon> {
  return tile ? tileCollection(tile.zoom, tile.x, tile.y) : EMPTY;
}

/** Whether `a` and `b` are the same tile, or both none. */
export function sameTile(a: TileRef | null, b: TileRef | null): boolean {
  return a === b || (a !== null && b !== null && a.zoom === b.zoom && a.x === b.x && a.y === b.y);
}

/**
 * Adds the outline of the highlighted tile below `beforeId`, typically the
 * first label layer: over the tiles and the tracks, it marks the tile a
 * click opens.
 */
export function addTileHighlight(
  map: MapLibreMap,
  tile: TileRef | null,
  palette: MapPalette,
  beforeId: string | undefined,
): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data: highlightData(tile) });
  map.addLayer(
    {
      id: LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      // Discreet: it suggests the click without hiding the tile.
      paint: { "line-color": palette.highlight, "line-opacity": 0.55, "line-width": 1.5 },
    },
    beforeId,
  );
}

/** Outlines `tile`, or nothing; ignored until the layer is added. */
export function setTileHighlight(map: MapLibreMap, tile: TileRef | null): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(highlightData(tile));
}

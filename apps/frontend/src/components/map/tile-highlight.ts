import type { FeatureCollection, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { tileCollection, type TileZoom } from "@/lib/tiles/tile-geometry";
import type { MapPalette } from "./map-style";

/** The tile under the pointer, a click opens it; the tile shown in the panel. */
const OUTLINES = {
  hovered: { source: "tile-hover", layer: "tile-hover-line", opacity: 0.35, width: 1 },
  selected: { source: "tile-selected", layer: "tile-selected-line", opacity: 0.85, width: 2 },
} as const;

type Outline = keyof typeof OUTLINES;

/** A tile of one of the two levels. */
export interface TileRef {
  zoom: TileZoom;
  x: number;
  y: number;
}

const EMPTY: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };

function outlineData(tile: TileRef | null): FeatureCollection<Polygon> {
  return tile ? tileCollection(tile.zoom, tile.x, tile.y) : EMPTY;
}

/** Whether `a` and `b` are the same tile, or both none. */
export function sameTile(a: TileRef | null, b: TileRef | null): boolean {
  return a === b || (a !== null && b !== null && a.zoom === b.zoom && a.x === b.x && a.y === b.y);
}

/**
 * Adds the outlines of the hovered and selected tiles below `beforeId`,
 * typically the first label layer, over the tiles and the tracks. The
 * hovered one stays discreet: it only suggests the click.
 */
export function addTileOutlines(
  map: MapLibreMap,
  tiles: Record<Outline, TileRef | null>,
  palette: MapPalette,
  beforeId: string | undefined,
): void {
  for (const [name, { source, layer, opacity, width }] of Object.entries(OUTLINES) as [
    Outline,
    (typeof OUTLINES)[Outline],
  ][]) {
    if (map.getSource(source)) continue;
    map.addSource(source, { type: "geojson", data: outlineData(tiles[name]) });
    map.addLayer(
      {
        id: layer,
        type: "line",
        source,
        paint: { "line-color": palette.highlight, "line-opacity": opacity, "line-width": width },
      },
      beforeId,
    );
  }
}

/** Outlines `tile` as hovered or selected, or nothing; ignored until the layers are added. */
export function setTileOutline(map: MapLibreMap, outline: Outline, tile: TileRef | null): void {
  map.getSource<GeoJSONSource>(OUTLINES[outline].source)?.setData(outlineData(tile));
}

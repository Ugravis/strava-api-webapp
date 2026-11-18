import type { Map as MapLibreMap } from "maplibre-gl";

/** Bounds of the zone of a station, in degrees. */
export interface StationBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Room taken over the map by the panel on its right and the bands at its bottom, in pixels. */
export interface MapInsets {
  right: number;
  bottom: number;
}

/** Room left around the zone of a station centered, in pixels. */
const STATION_MARGIN_PX = 48;
/** Zoom of a station centered, like a small tile: it spans about a fifth of a large screen. */
export const STATION_CENTER_ZOOM = 15;

/**
 * Centers the station beside the panel and above the bands, zoomed in like
 * a small tile (`zoomIn`) or as it is, but out enough for its whole zone to
 * fit.
 */
export function centerStation(
  map: MapLibreMap,
  station: { lon: number; lat: number },
  bounds: StationBounds | null,
  { right, bottom }: MapInsets,
  zoomIn: boolean,
): void {
  const fit =
    bounds &&
    map.cameraForBounds([bounds.west, bounds.south, bounds.east, bounds.north], {
      padding: { top: STATION_MARGIN_PX, left: STATION_MARGIN_PX, right: right + STATION_MARGIN_PX, bottom: bottom + STATION_MARGIN_PX },
    });
  const zoom = zoomIn ? STATION_CENTER_ZOOM : map.getZoom();
  map.easeTo({
    center: bounds ? [(bounds.west + bounds.east) / 2, (bounds.north + bounds.south) / 2] : [station.lon, station.lat],
    zoom: fit?.zoom !== undefined ? Math.min(zoom, fit.zoom) : zoom,
    offset: [-right / 2, -bottom / 2],
  });
}

/** Whether the zone of a station sticks out of the map left beside the panel and above the bands. */
export function stationCut(map: MapLibreMap, bounds: StationBounds, { right, bottom }: MapInsets): boolean {
  const { clientWidth, clientHeight } = map.getContainer();
  return [
    [bounds.west, bounds.north],
    [bounds.east, bounds.south],
  ].some(([lon, lat]) => {
    const { x, y } = map.project([lon, lat]);
    return x < 0 || y < 0 || x > clientWidth - right || y > clientHeight - bottom;
  });
}

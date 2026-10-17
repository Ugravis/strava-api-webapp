import type { FeatureCollection, LineString } from "geojson";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { TRACK_COLOR } from "./map-style";
import { fadeIn } from "./tile-layers";

const SOURCE_ID = "activity-tracks";
export const TRACK_LAYER_ID = "activity-tracks-line";
/** Over the tiles, the tracks fade in over two zooms once zoomed in on a few towns. */
const TRACK_MIN_ZOOM = 10;
const TRACK_FADE_ZOOMS = 2;

export type TrackCollection = FeatureCollection<LineString, { activityId: string }>;

export function trackCollection(lines: TrackLine[]): TrackCollection {
  return {
    type: "FeatureCollection",
    features: lines.map(({ activityId, coordinates }) => ({
      type: "Feature",
      properties: { activityId },
      geometry: { type: "LineString", coordinates },
    })),
  };
}

export function boundsOf(lines: TrackLine[]): LngLatBoundsLike | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const { coordinates } of lines) {
    for (const [lng, lat] of coordinates) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  return Number.isFinite(west) ? [west, south, east, north] : null;
}

/** Adds the track layer below `beforeId`, typically the first label layer. */
export function addTrackLayer(
  map: MapLibreMap,
  data: TrackCollection,
  visible: boolean,
  beforeId: string | undefined,
): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  map.addLayer(
    {
      id: TRACK_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      minzoom: TRACK_MIN_ZOOM,
      layout: { "line-join": "round", "line-cap": "round", visibility: visible ? "visible" : "none" },
      paint: {
        "line-color": TRACK_COLOR,
        "line-opacity": fadeIn(TRACK_MIN_ZOOM, 0.8, TRACK_FADE_ZOOMS),
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 12, 0.8, 17, 1.6],
      },
    },
    beforeId,
  );
}

export function setTrackData(map: MapLibreMap, data: TrackCollection): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
}

export function setTracksVisible(map: MapLibreMap, visible: boolean): void {
  if (map.getLayer(TRACK_LAYER_ID)) map.setLayoutProperty(TRACK_LAYER_ID, "visibility", visible ? "visible" : "none");
}

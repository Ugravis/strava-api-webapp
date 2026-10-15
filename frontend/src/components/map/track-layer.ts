import type { FeatureCollection, LineString } from "geojson";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { TRACK_COLOR } from "./map-style";

const SOURCE_ID = "activity-tracks";
const LAYER_ID = "activity-tracks-line";

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
export function addTrackLayer(map: MapLibreMap, data: TrackCollection, beforeId: string | undefined): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  map.addLayer(
    {
      id: LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": TRACK_COLOR,
        "line-opacity": 0.75,
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 10, 2, 15, 3.5],
      },
    },
    beforeId,
  );
}

export function setTrackData(map: MapLibreMap, data: TrackCollection): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
}

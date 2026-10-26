import type { FeatureCollection, LineString } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import type { MapPalette } from "./map-style";

const SOURCE_ID = "activity-track";
const LAYER_IDS = ["activity-track-casing", "activity-track-line"] as const;

export type ActivityTrack = FeatureCollection<LineString>;

/** The track of the activity shown, or nothing when it is not stored in the browser. */
export function activityTrack(line: TrackLine | undefined): ActivityTrack {
  return {
    type: "FeatureCollection",
    features: line ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line.coordinates } }] : [],
  };
}

/** Width by zoom, its casing wider by `extra` pixels: visible at every zoom, unlike the other tracks. */
function width(extra = 0): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 4, 2 + extra, 12, 3 + extra, 17, 4.5 + extra];
}

/**
 * Adds the track of the activity shown below `beforeId`, typically the
 * first label layer: over the other tracks and the tiles, in pink over a
 * white casing.
 */
export function addActivityTrackLayer(
  map: MapLibreMap,
  data: ActivityTrack,
  visible: boolean,
  palette: MapPalette,
  beforeId: string | undefined,
): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  const layout = { "line-cap": "round", "line-join": "round" } as const;
  map.addLayer(
    {
      id: LAYER_IDS[0],
      type: "line",
      source: SOURCE_ID,
      layout,
      paint: { "line-color": palette.activityTrackCasing, "line-width": width(3) },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: LAYER_IDS[1],
      type: "line",
      source: SOURCE_ID,
      layout,
      paint: { "line-color": palette.activityTrack, "line-width": width() },
    },
    beforeId,
  );
  setActivityTrackVisible(map, visible);
}

/** Shows or hides the track of the activity; ignored until the layers are added. */
export function setActivityTrackVisible(map: MapLibreMap, visible: boolean): void {
  for (const id of LAYER_IDS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

/** Draws the track of another activity, or none; ignored until the layers are added. */
export function setActivityTrack(map: MapLibreMap, data: ActivityTrack): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
}

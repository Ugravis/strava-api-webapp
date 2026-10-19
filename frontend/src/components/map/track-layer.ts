import type { FeatureCollection, LineString } from "geojson";
import type { ExpressionSpecification, GeoJSONSource, LngLatBoundsLike, Map as MapLibreMap } from "maplibre-gl";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { fadeIn, type MapPalette } from "./map-style";

const SOURCE_ID = "activity-tracks";
export const TRACK_LAYER_ID = "activity-tracks-line";
/** Lowest layer of the tracks: the tiles go below it. */
export const TRACK_CASING_LAYER_ID = "activity-tracks-casing";
const TRACK_LAYERS = [TRACK_CASING_LAYER_ID, TRACK_LAYER_ID];
/** The tracks fade in over two zooms once zoomed in on a town. */
const TRACK_MIN_ZOOM = 12;
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

/** Track width by zoom, its casing wider by `extra` pixels. */
function trackWidth(extra = 0): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], 4, 0.5 + extra, 12, 0.9 + extra, 17, 1.8 + extra];
}

/**
 * Adds the tracks below `beforeId`, typically the first label layer, over a
 * faint dark casing: they stay readable over the land and the tiles.
 */
export function addTrackLayer(
  map: MapLibreMap,
  data: TrackCollection,
  palette: MapPalette,
  visible: boolean,
  beforeId: string | undefined,
): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  const common = {
    type: "line",
    source: SOURCE_ID,
    minzoom: TRACK_MIN_ZOOM,
    layout: { "line-join": "round", "line-cap": "round", visibility: visible ? "visible" : "none" },
  } as const;
  map.addLayer(
    {
      ...common,
      id: TRACK_CASING_LAYER_ID,
      paint: {
        "line-color": palette.trackCasing,
        "line-opacity": fadeIn(TRACK_MIN_ZOOM, 0.35, TRACK_FADE_ZOOMS),
        "line-width": trackWidth(1),
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      ...common,
      id: TRACK_LAYER_ID,
      paint: {
        "line-color": palette.track,
        "line-opacity": fadeIn(TRACK_MIN_ZOOM, 0.75, TRACK_FADE_ZOOMS),
        "line-width": trackWidth(),
      },
    },
    beforeId,
  );
}

export function setTrackData(map: MapLibreMap, data: TrackCollection): void {
  map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(data);
}

export function setTracksVisible(map: MapLibreMap, visible: boolean): void {
  for (const id of TRACK_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

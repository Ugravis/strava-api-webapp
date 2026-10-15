"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, LineString } from "geojson";
import { type GeoJSONSource, type LngLatBoundsLike, Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { DEFAULT_VIEW, mapStyleUrl, TRACK_COLOR } from "./map-style";

const SOURCE_ID = "activity-tracks";
const LAYER_ID = "activity-tracks-line";

type TrackCollection = FeatureCollection<LineString, { activityId: string }>;

function toCollection(lines: TrackLine[]): TrackCollection {
  return {
    type: "FeatureCollection",
    features: lines.map(({ activityId, coordinates }) => ({
      type: "Feature",
      properties: { activityId },
      geometry: { type: "LineString", coordinates },
    })),
  };
}

function boundsOf(lines: TrackLine[]): LngLatBoundsLike | null {
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

/** Adds the track layer below the first label layer, keeping place names readable. */
function addTrackLayer(map: MapLibreMap, data: TrackCollection): void {
  if (map.getSource(SOURCE_ID)) return;
  map.addSource(SOURCE_ID, { type: "geojson", data });
  const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
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
    firstLabel,
  );
}

/** Vector map drawing every activity track. */
export function ActivityMap({ lines, label }: { lines: TrackLine[]; label: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const dataRef = useRef<TrackCollection>(toCollection([]));
  const framedRef = useRef(false);
  const initialStyleRef = useRef(mapStyleUrl(resolvedTheme));

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: initialStyleRef.current,
      ...DEFAULT_VIEW,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    // A style change drops the custom layers: they are added back each time.
    map.on("style.load", () => addTrackLayer(map, dataRef.current));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const url = mapStyleUrl(resolvedTheme);
    if (url === initialStyleRef.current) return;
    initialStyleRef.current = url;
    mapRef.current?.setStyle(url);
  }, [resolvedTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    dataRef.current = toCollection(lines);
    map.getSource<GeoJSONSource>(SOURCE_ID)?.setData(dataRef.current);
    if (!framedRef.current) {
      const bounds = boundsOf(lines);
      if (bounds) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 0 });
        framedRef.current = true;
      }
    }
  }, [lines]);

  return <div ref={containerRef} role="region" aria-label={label} className="absolute inset-0" />;
}

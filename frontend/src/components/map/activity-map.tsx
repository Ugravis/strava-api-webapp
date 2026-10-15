"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import type { TileCell } from "@/lib/tiles/tile-geometry";
import { DEFAULT_VIEW, mapStyleUrl } from "./map-style";
import { addTileLayers, setTileData, setTileMode, type TileData, tileData, type TileMode, updateGrids } from "./tile-layers";
import { addTrackLayer, boundsOf, setTrackData, type TrackCollection, trackCollection } from "./track-layer";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

interface ActivityMapProps {
  lines: TrackLine[];
  /** Null while loading. */
  cells: TileCell[] | null;
  tileMode: TileMode;
  label: string;
}

/** Vector map drawing every activity track and the tiles they crossed. */
export function ActivityMap({ lines, cells, tileMode, label }: ActivityMapProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Kept for the style changes, which drop the custom layers.
  const tracksRef = useRef<TrackCollection>(trackCollection([]));
  const tilesRef = useRef<TileData>(tileData([]));
  const modeRef = useRef(tileMode);
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
    map.on("style.load", () => {
      // Below the first label layer, keeping place names readable; tracks over tiles.
      const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      addTileLayers(map, tilesRef.current, firstLabel);
      addTrackLayer(map, tracksRef.current, firstLabel);
      setTileMode(map, modeRef.current);
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
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
    tracksRef.current = trackCollection(lines);
    setTrackData(map, tracksRef.current);
    if (!framedRef.current) {
      const bounds = boundsOf(lines);
      if (bounds) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 13, duration: 0 });
        framedRef.current = true;
      }
    }
  }, [lines]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !cells) return;
    tilesRef.current = tileData(cells);
    setTileData(map, tilesRef.current);
  }, [cells]);

  useEffect(() => {
    modeRef.current = tileMode;
    // Layers not added yet get the mode once the style is loaded.
    if (mapRef.current) setTileMode(mapRef.current, tileMode);
  }, [tileMode]);

  // MapLibre styles its container (`position: relative`): it is wrapped to fill the parent.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="region" aria-label={label} className="size-full" />
    </div>
  );
}

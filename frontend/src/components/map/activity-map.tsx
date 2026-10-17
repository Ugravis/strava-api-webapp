"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import type { TilesSummary } from "@/lib/api/types";
import { tileAt, type TileZoom } from "@/lib/tiles/tile-geometry";
import { NO_COUNTRIES, setVisitedCountries, type VisitedCountries } from "./country-layer";
import { DEFAULT_VIEW, mapStyleUrl } from "./map-style";
import {
  addTileLayers,
  CLICKABLE_LAYERS,
  clickableZooms,
  setTileData,
  setTileMode,
  type TileData,
  tileData,
  type TileMode,
  updateGrids,
  visitedTileNear,
} from "./tile-layers";
import { TilePopup } from "./tile-popup";
import {
  addTrackLayer,
  boundsOf,
  setTrackData,
  setTracksVisible,
  TRACK_LAYER_ID,
  type TrackCollection,
  trackCollection,
} from "./track-layer";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

interface ActivityMapProps {
  lines: TrackLine[];
  /** Null while loading. */
  summary: TilesSummary | null;
  countries: VisitedCountries;
  tileMode: TileMode;
  showTracks: boolean;
  label: string;
}

interface SelectedTile {
  /** Mode the tile was picked in: changing it closes the popup. */
  mode: TileMode;
  zoom: TileZoom;
  x: number;
  y: number;
  lngLat: [number, number];
}

/** Vector map drawing every activity track and the tiles they crossed. */
export function ActivityMap({ lines, summary, countries, tileMode, showTracks, label }: ActivityMapProps) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  // Kept for the style changes, which drop the custom layers.
  const tracksRef = useRef<TrackCollection>(trackCollection([]));
  const tilesRef = useRef<TileData>(tileData(null));
  const countriesRef = useRef<VisitedCountries>(NO_COUNTRIES);
  // Whether the custom layers can be added. `isStyleLoaded()` stays false
  // while any tile of the base map is loading.
  const styleReadyRef = useRef(false);
  const modeRef = useRef(tileMode);
  const showTracksRef = useRef(showTracks);
  const framedRef = useRef(false);
  const initialStyleRef = useRef(mapStyleUrl(resolvedTheme));

  const [selected, setSelected] = useState<SelectedTile | null>(null);
  // The popup content is rendered by React, inside the node MapLibre positions.
  const [popupNode] = useState(() => document.createElement("div"));

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
      styleReadyRef.current = true;
      // Below the first label layer, keeping place names readable; tracks
      // over tiles. The countries go lower, below the roads.
      const firstLabel = firstLabelId(map);
      setVisitedCountries(map, countriesRef.current);
      addTileLayers(map, tilesRef.current, firstLabel);
      addTrackLayer(map, tracksRef.current, showTracksRef.current, firstLabel);
      setTileMode(map, modeRef.current);
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
    // The tracks arrive after the map: once the user has moved it, they no
    // longer frame it.
    map.on("movestart", (event) => {
      if (event.originalEvent) framedRef.current = true;
    });
    map.on("click", (event) => setSelected(selectTile(map, modeRef.current, event)));
    for (const layer of CLICKABLE_LAYERS) {
      map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
    }
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
    styleReadyRef.current = false;
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
    tilesRef.current = tileData(summary);
    const map = mapRef.current;
    // Before the style is loaded, the layers get the tiles on load.
    if (!map || !styleReadyRef.current || setTileData(map, tilesRef.current)) return;
    // First version of the tiles: the layers go below the tracks.
    addTileLayers(map, tilesRef.current, map.getLayer(TRACK_LAYER_ID) ? TRACK_LAYER_ID : firstLabelId(map));
    setTileMode(map, modeRef.current);
  }, [summary]);

  useEffect(() => {
    countriesRef.current = countries;
    // Before the style is loaded, the layers get the countries on load.
    if (mapRef.current && styleReadyRef.current) setVisitedCountries(mapRef.current, countries);
  }, [countries]);

  useEffect(() => {
    modeRef.current = tileMode;
    // Layers not added yet get the mode once the style is loaded.
    if (mapRef.current) setTileMode(mapRef.current, tileMode);
  }, [tileMode]);

  useEffect(() => {
    showTracksRef.current = showTracks;
    // A layer not added yet is shown or hidden once the style is loaded.
    if (mapRef.current) setTracksVisible(mapRef.current, showTracks);
  }, [showTracks]);

  const shown = selected?.mode === tileMode ? selected : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shown) return;
    // The map's click handler already selects another tile or none.
    const popup = new Popup({ className: "tile-popup", maxWidth: "none", closeOnClick: false, focusAfterOpen: false })
      .setLngLat(shown.lngLat)
      .setDOMContent(popupNode)
      .addTo(map);
    // Closed by its button: the selection follows.
    const onClose = () => setSelected(null);
    popup.on("close", onClose);
    return () => {
      popup.off("close", onClose);
      popup.remove();
    };
  }, [shown, popupNode]);

  // MapLibre styles its container (`position: relative`): it is wrapped to fill the parent.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="region" aria-label={label} className="size-full" />
      {shown &&
        createPortal(
          <TilePopup key={`${shown.zoom}/${shown.x}/${shown.y}`} zoom={shown.zoom} x={shown.x} y={shown.y} />,
          popupNode,
        )}
    </div>
  );
}

/** Below the first label layer, keeping place names readable. */
function firstLabelId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

/**
 * The visited tile under the pointer or a few pixels from it, at the level
 * shown, from the tiles drawn. In the combined view, an unvisited small
 * tile falls back to its large tile.
 */
function selectTile(
  map: MapLibreMap,
  mode: TileMode,
  { point, lngLat: { lng, lat } }: { point: { x: number; y: number }; lngLat: { lng: number; lat: number } },
): SelectedTile | null {
  const found = visitedTileNear(map, point, clickableZooms(mode, map.getZoom()));
  if (!found) return null;
  const at = found.point === point ? { lng, lat } : map.unproject([found.point.x, found.point.y]);
  const [x, y] = tileAt(at.lng, at.lat, found.zoom);
  // The popup stays where the pointer is.
  return { mode, zoom: found.zoom, x, y, lngLat: [lng, lat] };
}

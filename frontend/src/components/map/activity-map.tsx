"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, Popup, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { type ExploredTiles, TILE_ZOOM, TileIndex, tileAt, type TileZoom } from "@/lib/tiles/tile-geometry";
import { NO_COUNTRIES, setVisitedCountries, type VisitedCountries } from "./country-layer";
import { DEFAULT_VIEW, mapStyleUrl } from "./map-style";
import {
  addTileLayers,
  CLICKABLE_LAYERS,
  clickedZoom,
  setTileData,
  setTileMode,
  type TileData,
  tileData,
  type TileMode,
  updateGrids,
} from "./tile-layers";
import { TilePopup } from "./tile-popup";
import {
  addTrackLayer,
  boundsOf,
  setTrackData,
  setTracksOverTiles,
  type TrackCollection,
  trackCollection,
} from "./track-layer";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

interface ActivityMapProps {
  lines: TrackLine[];
  /** Null while loading. */
  explored: ExploredTiles | null;
  countries: VisitedCountries;
  tileMode: TileMode;
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
export function ActivityMap({ lines, explored, countries, tileMode, label }: ActivityMapProps) {
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
  const framedRef = useRef(false);
  const initialStyleRef = useRef(mapStyleUrl(resolvedTheme));

  const index = useMemo(() => (explored ? new TileIndex(explored) : null), [explored]);
  const indexRef = useRef(index);
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
      const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      setVisitedCountries(map, countriesRef.current);
      addTileLayers(map, tilesRef.current, firstLabel);
      addTrackLayer(map, tracksRef.current, firstLabel);
      setTileMode(map, modeRef.current);
      setTracksOverTiles(map, modeRef.current !== "none");
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
    map.on("click", (event) => {
      const tile = selectTile(indexRef.current, modeRef.current, map.getZoom(), event.lngLat);
      setSelected(tile);
    });
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
    indexRef.current = index;
    const map = mapRef.current;
    if (!map || !explored) return;
    tilesRef.current = tileData(explored);
    setTileData(map, tilesRef.current);
  }, [explored, index]);

  useEffect(() => {
    countriesRef.current = countries;
    // Before the style is loaded, the layers get the countries on load.
    if (mapRef.current && styleReadyRef.current) setVisitedCountries(mapRef.current, countries);
  }, [countries]);

  useEffect(() => {
    modeRef.current = tileMode;
    // Layers not added yet get the mode once the style is loaded.
    if (mapRef.current) {
      setTileMode(mapRef.current, tileMode);
      setTracksOverTiles(mapRef.current, tileMode !== "none");
    }
  }, [tileMode]);

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

  const summary = shown && index?.summary(shown.zoom, shown.x, shown.y);

  // MapLibre styles its container (`position: relative`): it is wrapped to fill the parent.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="region" aria-label={label} className="size-full" />
      {shown &&
        summary &&
        createPortal(
          <TilePopup
            key={`${shown.zoom}/${shown.x}/${shown.y}`}
            zoom={shown.zoom}
            x={shown.x}
            y={shown.y}
            summary={summary}
          />,
          popupNode,
        )}
    </div>
  );
}

/**
 * The visited tile under the pointer, at the level shown. In the combined
 * view, an unvisited small tile falls back to its large tile.
 */
function selectTile(
  index: TileIndex | null,
  mode: TileMode,
  mapZoom: number,
  { lng, lat }: { lng: number; lat: number },
): SelectedTile | null {
  const zoom = clickedZoom(mode, mapZoom);
  if (!index || zoom === null) return null;
  const candidates: TileZoom[] = mode === "both" && zoom !== TILE_ZOOM ? [zoom, TILE_ZOOM] : [zoom];
  for (const candidate of candidates) {
    const [x, y] = tileAt(lng, lat, candidate);
    if (index.isVisited(candidate, x, y)) return { mode, zoom: candidate, x, y, lngLat: [lng, lat] };
  }
  return null;
}

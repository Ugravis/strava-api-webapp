"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import type { TilesSummary } from "@/lib/api/types";
import { tileAt } from "@/lib/tiles/tile-geometry";
import { NO_COUNTRIES, setVisitedCountries, type VisitedCountries } from "./country-layer";
import { BASE_STYLE_URL, DEFAULT_VIEW, type MapPalette, mapPalette, recolorStyle } from "./map-style";
import {
  addTileLayers,
  clickableZooms,
  setTileData,
  setTileMode,
  type TileData,
  tileData,
  type TileMode,
  updateGrids,
  visitedTileNear,
} from "./tile-layers";
import { TileDialog } from "./tile-dialog";
import { addTileHighlight, sameTile, setTileHighlight, type TileRef } from "./tile-highlight";
import {
  addTrackLayer,
  boundsOf,
  setTrackData,
  setTracksVisible,
  TRACK_CASING_LAYER_ID,
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

interface SelectedTile extends TileRef {
  /** Mode the tile was picked in: changing it closes the dialog. */
  mode: TileMode;
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
  const palette = mapPalette(resolvedTheme);
  const paletteRef = useRef(palette);

  const [selected, setSelected] = useState<SelectedTile | null>(null);
  // Outside React: the pointer moves far more often than the map should render.
  const hoveredRef = useRef<TileRef | null>(null);
  const shownRef = useRef<TileRef | null>(null);

  // Before the creation of the map: a hot reload of the code recreates the
  // map with the colors of the new code, instead of loading its style twice.
  useEffect(() => {
    if (palette === paletteRef.current) return;
    paletteRef.current = palette;
    styleReadyRef.current = false;
    if (mapRef.current) setBaseStyle(mapRef.current, palette);
  }, [palette]);

  useEffect(() => {
    if (!containerRef.current) return;
    // A new map, its style not loaded yet: the layers wait for it.
    styleReadyRef.current = false;
    const map = new MapLibreMap({
      container: containerRef.current,
      ...DEFAULT_VIEW,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    setBaseStyle(map, paletteRef.current);
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => {
      styleReadyRef.current = true;
      // Below the first label layer, keeping place names readable; tracks
      // over tiles. The countries go lower, below the roads.
      const firstLabel = firstLabelId(map);
      setVisitedCountries(map, countriesRef.current, paletteRef.current);
      addTileLayers(map, tilesRef.current, paletteRef.current, firstLabel);
      addTrackLayer(map, tracksRef.current, paletteRef.current, showTracksRef.current, firstLabel);
      addTileHighlight(map, shownRef.current ?? hoveredRef.current, paletteRef.current, firstLabel);
      setTileMode(map, modeRef.current);
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
    // The tracks arrive after the map: once the user has moved it, they no
    // longer frame it.
    map.on("movestart", (event) => {
      if (event.originalEvent) framedRef.current = true;
    });
    map.on("click", (event) => {
      const tile = pickTile(map, modeRef.current, event.point);
      setSelected(tile && { ...tile, mode: modeRef.current });
    });
    // The tile under the pointer is outlined: a click opens it. Looked for
    // once per frame, and not while the map moves under the pointer.
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const hover = (tile: TileRef | null) => {
      if (sameTile(tile, hoveredRef.current)) return;
      hoveredRef.current = tile;
      map.getCanvas().style.cursor = tile ? "pointer" : "";
      setTileHighlight(map, shownRef.current ?? tile);
    };
    const pickHovered = () => {
      frame = 0;
      hover(pointer && !map.isMoving() ? pickTile(map, modeRef.current, pointer) : null);
    };
    map.on("mousemove", (event) => {
      pointer = event.point;
      if (!frame) frame = requestAnimationFrame(pickHovered);
    });
    map.on("mouseout", () => {
      pointer = null;
      hover(null);
    });
    map.on("movestart", () => hover(null));
    map.on("moveend", pickHovered);
    mapRef.current = map;
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
    const beforeId = map.getLayer(TRACK_CASING_LAYER_ID) ? TRACK_CASING_LAYER_ID : firstLabelId(map);
    addTileLayers(map, tilesRef.current, paletteRef.current, beforeId);
    setTileMode(map, modeRef.current);
  }, [summary]);

  useEffect(() => {
    countriesRef.current = countries;
    // Before the style is loaded, the layers get the countries on load.
    if (mapRef.current && styleReadyRef.current) setVisitedCountries(mapRef.current, countries, paletteRef.current);
  }, [countries]);

  useEffect(() => {
    modeRef.current = tileMode;
    // Layers not added yet get the mode once the style is loaded.
    if (!mapRef.current) return;
    setTileMode(mapRef.current, tileMode);
    // The tile under the pointer may belong to the other level.
    hoveredRef.current = null;
    mapRef.current.getCanvas().style.cursor = "";
    setTileHighlight(mapRef.current, shownRef.current);
  }, [tileMode]);

  useEffect(() => {
    showTracksRef.current = showTracks;
    // A layer not added yet is shown or hidden once the style is loaded.
    if (mapRef.current) setTracksVisible(mapRef.current, showTracks);
  }, [showTracks]);

  const shown = selected?.mode === tileMode ? selected : null;

  useEffect(() => {
    shownRef.current = shown;
    // The selected tile stays outlined while its dialog is open.
    if (mapRef.current) setTileHighlight(mapRef.current, shown ?? hoveredRef.current);
  }, [shown]);

  // MapLibre styles its container (`position: relative`): it is wrapped to fill the parent.
  return (
    <div className="absolute inset-0">
      <div ref={containerRef} role="region" aria-label={label} className="size-full" />
      <TileDialog tile={shown} onClose={() => setSelected(null)} />
    </div>
  );
}

/**
 * Loads the base style in the colors of `palette`, from scratch: the custom
 * layers, dropped, are added again with the new colors once it is loaded.
 */
function setBaseStyle(map: MapLibreMap, palette: MapPalette): void {
  map.setStyle(BASE_STYLE_URL, { diff: false, transformStyle: (_, next) => recolorStyle(next, palette) });
}

/** Below the first label layer, keeping place names readable. */
function firstLabelId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

/**
 * The visited tile under the pointer or a few pixels from it, at the level
 * shown, from the tiles drawn; null where nothing can be picked. In the
 * combined view, an unvisited small tile falls back to its large tile.
 */
function pickTile(map: MapLibreMap, mode: TileMode, point: { x: number; y: number }): TileRef | null {
  const found = visitedTileNear(map, point, clickableZooms(mode, map.getZoom()));
  if (!found) return null;
  const { lng, lat } = map.unproject([found.point.x, found.point.y]);
  const [x, y] = tileAt(lng, lat, found.zoom);
  return { zoom: found.zoom, x, y };
}

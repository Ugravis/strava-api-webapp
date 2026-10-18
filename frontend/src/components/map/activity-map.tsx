"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActivityTiles } from "@/hooks/use-activity";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { usePanelHistory } from "@/hooks/use-panel-history";
import type { TilesSummary } from "@/lib/api/types";
import { SUBTILE_ZOOM, TILE_ZOOM, tileAt, tileCenter, type TileZoom, tilesBounds } from "@/lib/tiles/tile-geometry";
import { ActivityPanel } from "./activity-panel";
import {
  activityTileData,
  addActivityTileLayers,
  NO_ACTIVITY_TILES,
  setActivityLevels,
  setActivityTiles,
} from "./activity-tiles-layer";
import { activityTrack, addActivityTrackLayer, setActivityTrack, setActivityTrackVisible } from "./activity-track-layer";
import { NO_COUNTRIES, setVisitedCountries, type VisitedCountries } from "./country-layer";
import { type MapHistory, setHistory } from "./history-layer";
import { BANDS_HEIGHT_VAR } from "./map-bands";
import { MapSidePanel } from "./map-side-panel";
import { type MapSector, setSector } from "./sector-layer";
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
import { addTileOutlines, sameTile, setTileOutline, type TileRef } from "./tile-highlight";
import { TilePickPanel } from "./tile-pick-panel";
import { entryFromSearch, entryKey, sameEntry, searchWithEntry, shownTile, type TilePick } from "./panel-entry";
import { type ActivityView, defaultActivityView, hasGains } from "./activity-view";
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
  /** What the history tool draws; null while it is closed. */
  history: MapHistory | null;
  /** The sector picked with its tool; null while it is closed. */
  sector: MapSector | null;
  /** Incremented to frame the sector, once its bounds are known. */
  sectorFrame: number;
  label: string;
}

/** Margin around an activity or a sector framed on the map, in pixels. */
const ACTIVITY_PADDING = 48;
/** Zoom of the map centered on a tile of each level: it spans about a fifth of a large screen. */
const CENTER_ZOOMS: Record<TileZoom, number> = { [TILE_ZOOM]: 12, [SUBTILE_ZOOM]: 15 };

/** Vector map drawing every activity track and the tiles they crossed. */
export function ActivityMap({
  lines,
  summary,
  countries,
  tileMode,
  showTracks,
  history: mapHistory,
  sector,
  sectorFrame,
  label,
}: ActivityMapProps) {
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
  const mapHistoryRef = useRef(mapHistory);
  const sectorRef = useRef(sector);
  // The last request to frame the sector served.
  const sectorFramedRef = useRef(0);
  // Whether a past state is shown in place of today's tiles: only once it is loaded.
  const pastRef = useRef(false);
  const palette = mapPalette(resolvedTheme);
  const paletteRef = useRef(palette);

  const t = useTranslations("map.panel");
  // The address of the page may name a tile or an activity: the map opens on it.
  const [fromAddress] = useState(() => entryFromSearch(window.location.search));
  const history = usePanelHistory(sameEntry, fromAddress.entry);
  const entry = history.current;
  // Opened on a tile or an activity, the map does not frame the tracks.
  const framedRef = useRef(fromAddress.entry !== null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(collapsed);
  const panelRef = useRef<HTMLElement>(null);
  // Outside React: the pointer moves far more often than the map should render.
  const hoveredRef = useRef<TileRef | null>(null);
  const shownRef = useRef<TileRef | null>(null);
  // The click handler of the map is registered once: it calls the latest one.
  const pickRef = useRef<(pick: TilePick) => void>(() => {});
  // The tile just picked on the map or in the tabs: unlike a tile reached otherwise, the camera stays.
  const pickedRef = useRef<TileRef | null>(null);
  const activityId = entry?.kind === "activity" ? entry.activityId : null;
  const { tiles: activityTiles } = useActivityTiles(activityId);
  // Each activity opens with the default view, the small tiles as on the map.
  const [changedView, setChangedView] = useState<{ activityId: string; view: ActivityView } | null>(null);
  const defaultView = useMemo(() => defaultActivityView(tileMode === "both"), [tileMode]);
  const activityView = changedView && changedView.activityId === activityId ? changedView.view : defaultView;
  const activityViewRef = useRef(activityView);
  const activityData = useMemo(() => {
    if (!activityTiles) return NO_ACTIVITY_TILES;
    const { gains } = activityTiles;
    // Without any tile gained, the activity shows all of its tiles.
    return activityView.gainedOnly && hasGains(activityTiles) && gains
      ? activityTileData(gains.tiles.gained, gains.subtiles.gained)
      : activityTileData(activityTiles.tiles, activityTiles.subtiles);
  }, [activityTiles, activityView.gainedOnly]);
  const activityDataRef = useRef(activityData);
  const activityLine = useMemo(
    () => (activityId ? lines.find((line) => line.activityId === activityId) : undefined),
    [lines, activityId],
  );
  const activityTrackRef = useRef(activityTrack(activityLine));

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
      const view = activityViewRef.current;
      addActivityTileLayers(map, activityDataRef.current, view, paletteRef.current);
      addActivityTrackLayer(map, activityTrackRef.current, view.track, paletteRef.current, firstLabel);
      addTileOutlines(
        map,
        { hovered: hoveredRef.current, selected: shownRef.current },
        paletteRef.current,
        firstLabel,
      );
      pastRef.current = false;
      setTileMode(map, modeRef.current);
      drawHistory(map, mapHistoryRef.current, modeRef.current, paletteRef.current, pastRef);
      // Last: over every other layer.
      setSector(map, sectorRef.current, paletteRef.current);
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
    // The tracks arrive after the map: once the user has moved it, they no
    // longer frame it.
    map.on("movestart", (event) => {
      if (event.originalEvent) framedRef.current = true;
    });
    // A click beside the tiles keeps the panel: only its button closes it.
    map.on("click", (event) => {
      const pick = pickTile(map, modeRef.current, event.point);
      if (pick) pickRef.current(pick);
    });
    // The tile under the pointer is outlined: a click opens it. Looked for
    // once per frame, and not while the map moves under the pointer.
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const hover = (tile: TileRef | null) => {
      if (sameTile(tile, hoveredRef.current)) return;
      hoveredRef.current = tile;
      map.getCanvas().style.cursor = tile ? "pointer" : "";
      setTileOutline(map, "hovered", tile);
    };
    const pickHovered = () => {
      frame = 0;
      const pick = pointer && !map.isMoving() ? pickTile(map, modeRef.current, pointer) : null;
      hover(pick && shownTile(pick));
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
        map.fitBounds(bounds, {
          padding: { top: 40, left: 40, right: 40, bottom: 40 + bandsHeightOf(containerRef.current) },
          maxZoom: 13,
          duration: 0,
        });
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
    setTileMode(map, modeRef.current, pastRef.current);
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
    setTileMode(mapRef.current, tileMode, pastRef.current);
    if (styleReadyRef.current) drawHistory(mapRef.current, mapHistoryRef.current, tileMode, paletteRef.current, pastRef);
    // The tile under the pointer may belong to the other level.
    hoveredRef.current = null;
    mapRef.current.getCanvas().style.cursor = "";
    setTileOutline(mapRef.current, "hovered", null);
  }, [tileMode]);

  useEffect(() => {
    showTracksRef.current = showTracks;
    // A layer not added yet is shown or hidden once the style is loaded.
    if (mapRef.current) setTracksVisible(mapRef.current, showTracks);
  }, [showTracks]);

  useEffect(() => {
    mapHistoryRef.current = mapHistory;
    // Before the style is loaded, the layers get the history on load.
    if (mapRef.current && styleReadyRef.current) {
      drawHistory(mapRef.current, mapHistory, modeRef.current, paletteRef.current, pastRef);
    }
  }, [mapHistory]);

  useEffect(() => {
    sectorRef.current = sector;
    // Before the style is loaded, the layers get the sector on load.
    if (mapRef.current && styleReadyRef.current) setSector(mapRef.current, sector, paletteRef.current);
  }, [sector]);

  const sectorBounds = sector?.bounds;
  useEffect(() => {
    // Framed once per request, beside the panel and above the bands.
    const map = mapRef.current;
    if (!map || !sectorBounds || sectorFrame === sectorFramedRef.current) return;
    sectorFramedRef.current = sectorFrame;
    framedRef.current = true;
    map.fitBounds(sectorBounds, {
      padding: {
        top: ACTIVITY_PADDING,
        bottom: ACTIVITY_PADDING + bandsHeightOf(containerRef.current),
        left: ACTIVITY_PADDING,
        right: ACTIVITY_PADDING + panelWidthOf(panelRef.current, collapsedRef.current),
      },
    });
  }, [sectorBounds, sectorFrame]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    pickRef.current = (pick) => {
      pickedRef.current = shownTile(pick);
      history.push({ kind: "tile", ...pick });
      setCollapsed(false);
    };
  });

  const shown = entry?.kind === "tile" ? shownTile(entry) : null;

  useEffect(() => {
    if (fromAddress.invalid) toast.error(t("invalidLink"));
  }, [fromAddress, t]);

  useEffect(() => {
    // The address follows the entry shown, without adding to the history of the browser.
    const search = searchWithEntry(window.location.search, entry);
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}`);
    }
  }, [entry]);

  useEffect(() => {
    shownRef.current = shown;
    const map = mapRef.current;
    if (!map) return;
    // The selected tile stays outlined while the panel shows it.
    setTileOutline(map, "selected", shown);
    if (!shown) return;
    // Reached by the arrows or the address, the tile is centered beside the panel.
    if (shown === pickedRef.current) {
      pickedRef.current = null;
      return;
    }
    map.easeTo({
      center: tileCenter(shown.zoom, shown.x, shown.y),
      zoom: CENTER_ZOOMS[shown.zoom],
      offset: [-panelWidthOf(panelRef.current, collapsedRef.current) / 2, -bandsHeightOf(containerRef.current) / 2],
    });
  }, [shown]);

  useEffect(() => {
    activityDataRef.current = activityData;
    if (mapRef.current) setActivityTiles(mapRef.current, activityData);
  }, [activityData]);

  useEffect(() => {
    activityViewRef.current = activityView;
    const map = mapRef.current;
    if (!map) return;
    setActivityLevels(map, activityView);
    setActivityTrackVisible(map, activityView.track);
  }, [activityView]);

  useEffect(() => {
    activityTrackRef.current = activityTrack(activityLine);
    if (mapRef.current) setActivityTrack(mapRef.current, activityTrackRef.current);
  }, [activityLine]);

  useEffect(() => {
    // The activity shown is the focus: the map frames all of it, beside the panel.
    const map = mapRef.current;
    const bounds = activityTiles && tilesBounds(TILE_ZOOM, activityTiles.tiles);
    if (!map || !bounds) return;
    map.fitBounds([bounds.west, bounds.south, bounds.east, bounds.north], {
      padding: {
        top: ACTIVITY_PADDING,
        bottom: ACTIVITY_PADDING + bandsHeightOf(containerRef.current),
        left: ACTIVITY_PADDING,
        right: ACTIVITY_PADDING + panelWidthOf(panelRef.current, collapsedRef.current),
      },
      maxZoom: SUBTILE_ZOOM - 3,
    });
  }, [activityTiles]);

  // MapLibre styles its container (`position: relative`): it is wrapped to fill the parent.
  return (
    <div className="map-with-panel absolute inset-0" data-panel={entry && !collapsed ? "open" : undefined}>
      <div ref={containerRef} role="region" aria-label={label} className="size-full" />
      {entry && (
        <MapSidePanel
          ref={panelRef}
          contentKey={entryKey(entry)}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          canGoBack={history.canGoBack}
          canGoForward={history.canGoForward}
          onBack={history.back}
          onForward={history.forward}
          onClose={() => {
            history.clear();
            setCollapsed(false);
          }}
        >
          {entry.kind === "tile" ? (
            <TilePickPanel
              pick={entry}
              onZoomChange={(zoom) => {
                const pick = { ...entry, zoom };
                // Another level of the same place: the camera stays.
                pickedRef.current = shownTile(pick);
                history.replace(pick);
              }}
              onOpenActivity={(activityId) => history.push({ kind: "activity", activityId })}
            />
          ) : (
            <ActivityPanel
              key={entry.activityId}
              activityId={entry.activityId}
              tiles={activityTiles}
              hasTrack={activityLine !== undefined}
              view={activityView}
              onViewChange={(view) => setChangedView({ activityId: entry.activityId, view })}
            />
          )}
        </MapSidePanel>
      )}
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

/**
 * Draws the history, or hides it. In the state mode, the history replaces
 * today's tiles once fully shown; otherwise they come back as it fades in.
 * `pastRef` follows what is shown.
 */
function drawHistory(
  map: MapLibreMap,
  history: MapHistory | null,
  mode: TileMode,
  palette: MapPalette,
  pastRef: { current: boolean },
): void {
  const past = history?.mode === "state";
  const showTiles = () => {
    pastRef.current = past;
    setTileMode(map, mode, past);
  };
  setHistory(map, history, palette, mode === "both", firstLabelId(map), {
    onFadeIn: () => {
      if (!past) showTiles();
    },
    onShown: () => {
      if (past) showTiles();
    },
  });
}

/** Height of the bands over the bottom of the map, as set by `MapBands`. */
function bandsHeightOf(container: HTMLElement | null): number {
  return container ? parseFloat(getComputedStyle(container).getPropertyValue(BANDS_HEIGHT_VAR)) || 0 : 0;
}

/** Width of the panel over the map: none when folded or closed. */
function panelWidthOf(panel: HTMLElement | null, collapsed: boolean): number {
  return panel && !collapsed ? panel.offsetWidth : 0;
}

/** Below the first label layer, keeping place names readable. */
function firstLabelId(map: MapLibreMap): string | undefined {
  return map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
}

/**
 * The visited tile under the pointer or a few pixels from it, at the level
 * shown, from the tiles drawn, with the large and small tiles at that place;
 * null where nothing can be picked. In the combined view, an unvisited small
 * tile falls back to its large tile.
 */
function pickTile(map: MapLibreMap, mode: TileMode, point: { x: number; y: number }): TilePick | null {
  const found = visitedTileNear(map, point, clickableZooms(mode, map.getZoom()));
  if (!found) return null;
  const { lng, lat } = map.unproject([found.point.x, found.point.y]);
  const tileOf = (zoom: TileZoom): TileRef => {
    const [x, y] = tileAt(lng, lat, zoom);
    return { zoom, x, y };
  };
  return { tile: tileOf(TILE_ZOOM), subtile: tileOf(SUBTILE_ZOOM), zoom: found.zoom };
}

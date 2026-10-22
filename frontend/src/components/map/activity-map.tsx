"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useActivityTiles } from "@/hooks/use-activity";
import type { TrackLine } from "@/hooks/use-activity-tracks";
import { usePanelHistory } from "@/hooks/use-panel-history";
import type { TilesSummary, VisitedStations } from "@/lib/api/types";
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
  TILE_CLICK_MIN_ZOOM,
  type TileData,
  tileData,
  type TileMode,
  updateGrids,
  visitedTileNear,
} from "./tile-layers";
import { addTileOutlines, sameTile, setTileOutline, type TileRef } from "./tile-highlight";
import { TilePickPanel } from "./tile-pick-panel";
import { entryFromSearch, entryKey, pickOf, sameEntry, searchWithEntry, shownTile, type TilePick } from "./panel-entry";
import { StationPanel } from "./station-panel";
import { TrainPanel } from "./train-panel";
import { TRAIN_FOLLOW_EVENT, TrainTraffic } from "./train-traffic";
import {
  addStationLayers,
  setAllStations,
  setHoveredStation,
  setMapDimmed,
  setSelectedStation,
  setStationData,
  setStationsVisible,
  stationData,
  stationNear,
  type StationPick,
  trainNear,
} from "./stations-layer";
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
  /**
   * Called with the center of the visible map, beside the panel and above
   * the bands, in degrees: once loaded, then whenever the camera stops,
   * unless it was framing the sector.
   */
  onCenterChange: (center: [number, number]) => void;
  /** Stations visited and the links between them; null while loading. */
  stations: VisitedStations | null;
  showStations: boolean;
  /** Whether the base map and the tiles are dimmed below the stations. */
  dimmed: boolean;
  label: string;
}

/** Margin around an activity or a sector framed on the map, in pixels. */
const ACTIVITY_PADDING = 48;
/** Zoom of the map centered on a tile of each level: it spans about a fifth of a large screen. */
const CENTER_ZOOMS: Record<TileZoom, number> = { [TILE_ZOOM]: 12, [SUBTILE_ZOOM]: 15 };
/** Marks the moves of the camera framing the sector. */
const SECTOR_FRAME_EVENT = "sectorFrame";
/** Zoom of the map centered on a station: its town and its neighbors around. */
const STATION_ZOOM = 13;

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
  onCenterChange,
  stations,
  showStations,
  dimmed,
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
  // The handlers of the map are registered once: they call the latest one.
  const onCenterChangeRef = useRef(onCenterChange);
  // Whether a past state is shown in place of today's tiles: only once it is loaded.
  const pastRef = useRef(false);
  const palette = mapPalette(resolvedTheme);
  const paletteRef = useRef(palette);
  const showStationsRef = useRef(showStations);
  const dimmedRef = useRef(dimmed);
  // The stations as of the history when open: the visits are dated.
  const stationsData = useMemo(() => stationData(stations, mapHistory), [stations, mapHistory]);
  const stationsDataRef = useRef(stationsData);
  const stationsVersion = stations?.stationsVersion ?? null;
  const stationsVersionRef = useRef(stationsVersion);
  // The station shown in the panel, ringed on the map.
  const selectedStationRef = useRef<StationPick | null>(null);
  // The station just picked on the map: unlike a station reached otherwise, the camera stays.
  const pickedStationRef = useRef<number | null>(null);
  const pickStationRef = useRef<(station: StationPick) => void>(() => {});
  const pickTrainRef = useRef<(trainId: number) => void>(() => {});

  const t = useTranslations("map.panel");
  // The address of the page may name a tile or an activity: the map opens on it.
  const [fromAddress] = useState(() => entryFromSearch(window.location.search));
  const history = usePanelHistory(sameEntry, fromAddress.entry);
  const entry = history.current;
  // Opened on a tile, an activity or a sector, the map does not frame the tracks.
  const framedRef = useRef(fromAddress.entry !== null || sectorFrame > 0);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedRef = useRef(collapsed);
  const panelRef = useRef<HTMLElement>(null);
  // Outside React: the pointer moves far more often than the map should render.
  const hoveredRef = useRef<TileRef | null>(null);
  const hoveredStationRef = useRef<StationPick | null>(null);
  const trafficRef = useRef<TrainTraffic | null>(null);
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
      addStationLayers(
        map,
        stationsDataRef.current,
        selectedStationRef.current,
        hoveredStationRef.current,
        paletteRef.current,
        showStationsRef.current,
        dimmedRef.current,
        firstLabel,
      );
      setAllStations(map, stationsVersionRef.current, paletteRef.current, showStationsRef.current);
      pastRef.current = false;
      setTileMode(map, modeRef.current);
      drawHistory(map, mapHistoryRef.current, modeRef.current, paletteRef.current, pastRef);
      // Last: over every other layer.
      setSector(map, sectorRef.current, paletteRef.current);
    });
    map.on("moveend", () => updateGrids(map, modeRef.current));
    // The sector framed is kept, even when the center of its bounds falls
    // in a neighbor, as for Croatia.
    const reportCenter = () => {
      const { clientWidth, clientHeight } = map.getContainer();
      const { lng, lat } = map.unproject([
        (clientWidth - panelWidthOf(panelRef.current, collapsedRef.current)) / 2,
        (clientHeight - bandsHeightOf(containerRef.current)) / 2,
      ]);
      onCenterChangeRef.current([lng, lat]);
    };
    map.on("load", reportCenter);
    map.on("moveend", (event) => {
      if (!(SECTOR_FRAME_EVENT in event) && !(TRAIN_FOLLOW_EVENT in event)) reportCenter();
    });
    // The tracks arrive after the map: once the user has moved it, they no
    // longer frame it.
    map.on("movestart", (event) => {
      if (event.originalEvent) framedRef.current = true;
    });
    // A click beside the tiles keeps the panel: only its button closes it.
    map.on("click", (event) => {
      // The stations are drawn over the tiles: they are picked first.
      const train = showStationsRef.current ? trainNear(map, event.point) : null;
      if (train !== null) {
        pickTrainRef.current(train);
        return;
      }
      const station = showStationsRef.current ? stationNear(map, event.point) : null;
      if (station) {
        pickStationRef.current(station);
        return;
      }
      const pick = pickTile(map, modeRef.current, event.point);
      if (pick) pickRef.current(pick);
    });
    // The tile under the pointer is outlined: a click opens it. Looked for
    // once per frame, and not while the map moves under the pointer.
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const hover = (tile: TileRef | null, station: StationPick | null = null, train = false) => {
      map.getCanvas().style.cursor = tile || station || train ? "pointer" : "";
      if (station?.id !== hoveredStationRef.current?.id) {
        hoveredStationRef.current = station;
        setHoveredStation(map, station);
      }
      if (sameTile(tile, hoveredRef.current)) return;
      hoveredRef.current = tile;
      setTileOutline(map, "hovered", tile);
    };
    const pickHovered = () => {
      frame = 0;
      const still = pointer !== null && !map.isMoving();
      const stations = still && showStationsRef.current;
      const train = stations && trainNear(map, pointer!) !== null;
      // Over a station, no tile is outlined: a click opens the station. Ringed from the zoom the tiles are.
      const station = stations && !train && map.getZoom() >= TILE_CLICK_MIN_ZOOM ? stationNear(map, pointer!) : null;
      const pick = still && !station && !train ? pickTile(map, modeRef.current, pointer!) : null;
      hover(pick && shownTile(pick), station, train);
    };
    map.on("mousemove", (event) => {
      pointer = event.point;
      if (!frame) frame = requestAnimationFrame(pickHovered);
    });
    map.on("mouseout", () => {
      pointer = null;
      hover(null);
    });
    // The camera following a train keeps what the pointer is over.
    map.on("movestart", (event) => {
      if (!(TRAIN_FOLLOW_EVENT in event)) hover(null);
    });
    map.on("moveend", (event) => {
      if (!(TRAIN_FOLLOW_EVENT in event)) pickHovered();
    });
    mapRef.current = map;
    trafficRef.current = new TrainTraffic(map, showStationsRef.current, () => {
      const { clientWidth, clientHeight } = map.getContainer();
      return {
        x: (clientWidth - panelWidthOf(panelRef.current, collapsedRef.current)) / 2,
        y: (clientHeight - bandsHeightOf(containerRef.current)) / 2,
      };
    });
    trafficRef.current.setLinks(stationsDataRef.current.links);
    return () => {
      cancelAnimationFrame(frame);
      trafficRef.current?.destroy();
      trafficRef.current = null;
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
    stationsDataRef.current = stationsData;
    if (mapRef.current) setStationData(mapRef.current, stationsData);
    trafficRef.current?.setLinks(stationsData.links);
  }, [stationsData]);

  useEffect(() => {
    stationsVersionRef.current = stationsVersion;
    // Before the style is loaded, the layers get the version on load.
    if (mapRef.current && styleReadyRef.current) {
      setAllStations(mapRef.current, stationsVersion, paletteRef.current, showStationsRef.current);
    }
  }, [stationsVersion]);

  useEffect(() => {
    showStationsRef.current = showStations;
    // Layers not added yet are shown or hidden once the style is loaded.
    if (mapRef.current) setStationsVisible(mapRef.current, showStations);
    trafficRef.current?.setVisible(showStations);
  }, [showStations]);

  useEffect(() => {
    dimmedRef.current = dimmed;
    // A layer not added yet is shown or hidden once the style is loaded.
    if (mapRef.current) setMapDimmed(mapRef.current, dimmed);
  }, [dimmed]);

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
    map.fitBounds(
      sectorBounds,
      {
        padding: {
          top: ACTIVITY_PADDING,
          bottom: ACTIVITY_PADDING + bandsHeightOf(containerRef.current),
          left: ACTIVITY_PADDING,
          right: ACTIVITY_PADDING + panelWidthOf(panelRef.current, collapsedRef.current),
        },
      },
      { [SECTOR_FRAME_EVENT]: true },
    );
  }, [sectorBounds, sectorFrame]);

  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  useEffect(() => {
    pickRef.current = (pick) => {
      pickedRef.current = shownTile(pick);
      history.push({ kind: "tile", ...pick });
      setCollapsed(false);
    };
    pickStationRef.current = (station) => {
      pickedStationRef.current = station.id;
      history.push({ kind: "station", stationId: station.id });
      setCollapsed(false);
    };
    pickTrainRef.current = (trainId) => {
      history.push({ kind: "train", trainId });
      setCollapsed(false);
    };
  });

  const stationId = entry?.kind === "station" ? entry.stationId : null;
  const trainId = entry?.kind === "train" ? entry.trainId : null;

  useEffect(() => {
    // The train shown is marked and followed by the camera.
    trafficRef.current?.select(trainId);
  }, [trainId]);

  const trainInfo = useCallback((id: number) => trafficRef.current?.info(id) ?? null, []);
  const followTrain = useCallback((following: boolean) => trafficRef.current?.setFollowing(following), []);

  useEffect(() => {
    // The ring follows the station shown, once it is located.
    if (stationId !== null && selectedStationRef.current?.id === stationId) return;
    selectedStationRef.current = null;
    if (mapRef.current) setSelectedStation(mapRef.current, null);
  }, [stationId]);

  /** Rings the station shown and, unless just picked on the map, centers it beside the panel. */
  const locateStation = (station: StationPick) => {
    selectedStationRef.current = station;
    const map = mapRef.current;
    if (!map) return;
    setSelectedStation(map, station);
    if (pickedStationRef.current === station.id) {
      pickedStationRef.current = null;
      return;
    }
    map.easeTo({
      center: [station.lon, station.lat],
      zoom: Math.max(map.getZoom(), STATION_ZOOM),
      offset: [-panelWidthOf(panelRef.current, collapsedRef.current) / 2, -bandsHeightOf(containerRef.current) / 2],
    });
  };

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
          title={t(`kinds.${entry.kind}`)}
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
          {entry.kind === "train" ? (
            <TrainPanel
              key={entry.trainId}
              trainId={entry.trainId}
              getInfo={trainInfo}
              onFollowChange={followTrain}
              onOpenStation={(station) => history.push({ kind: "station", stationId: station.id })}
            />
          ) : entry.kind === "station" ? (
            <StationPanel
              key={entry.stationId}
              stationId={entry.stationId}
              onLocated={locateStation}
              onOpenStation={(station) => history.push({ kind: "station", stationId: station.id })}
              onOpenTile={(tile) => history.push({ kind: "tile", ...pickOf(tile) })}
              onOpenActivity={(activityId) => history.push({ kind: "activity", activityId })}
            />
          ) : entry.kind === "tile" ? (
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
